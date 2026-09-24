// src/frontend/src/hooks/useOrganizationPresence.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook de Presencia Organizacional en Tiempo Real para CoachData OS v2.
 * Rastrea usuarios conectados, vista actual y metadatos con soporte multi-tenant.
 */
export function useOrganizationPresence(organizationId = null) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    // Referencia local además del ref: durante los `await` de abajo,
    // `channelRef.current` sigue siendo null, así que si el efecto se desmonta
    // en ese hueco (StrictMode lo hace siempre) la limpieza no encuentra nada
    // que cerrar y el canal acaba huérfano.
    let canalLocal = null;

    async function initPresence() {
      if (!organizationId) return;

      const supabase = await getSupabase();
      if (!supabase || !isMounted) return;

      // Obtener identidad del usuario o sesión local
      const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: null }));
      const authUser = authData?.user;

      const localName = localStorage.getItem('coachdata-user-name') || (authUser?.email?.split('@')[0]) || 'Usuario';
      const userId = authUser?.id || `usr_${localName.toLowerCase()}`;
      const avatarUrl = authUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(localName)}&background=10b981&color=fff`;

      const presenceKey = `${userId}_${Math.random().toString(36).substring(2, 7)}`;

      // Si se desmontó mientras resolvíamos la identidad, no creamos canal.
      if (!isMounted) return;

      // Sufijo único: dos instancias del hook (o un remonte) sobre el mismo
      // nombre reutilizan un canal ya suscrito, y entonces `.on()` lanza
      // "cannot add presence callbacks after subscribe()".
      const channel = supabase.channel(`org-presence-${organizationId}-${presenceKey}`, {
        config: {
          presence: {
            key: presenceKey,
          },
        },
      });

      canalLocal = channel;
      channelRef.current = channel;

      const presenceStatePayload = {
        userId,
        fullName: localName,
        avatarUrl,
        currentView: 'operations',
        onlineAt: new Date().toISOString(),
      };

      channel
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          const usersList = [];

          Object.keys(state).forEach((key) => {
            const presences = state[key];
            if (Array.isArray(presences) && presences.length > 0) {
              const latest = presences[0];
              usersList.push({
                key,
                userId: latest.userId || key,
                fullName: latest.fullName || 'Colaborador',
                avatarUrl: latest.avatarUrl,
                currentView: latest.currentView || 'operations',
                onlineAt: latest.onlineAt || new Date().toISOString(),
              });
            }
          });

          setOnlineUsers(usersList);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            setIsConnected(true);
            await channel.track(presenceStatePayload);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            if (isMounted) setIsConnected(false);
          }
        });
    }

    initPresence();

    return () => {
      isMounted = false;
      const aCerrar = channelRef.current || canalLocal;
      if (aCerrar) {
        aCerrar.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [organizationId]);

  const trackView = useCallback(async (viewName) => {
    if (channelRef.current && isConnected) {
      const state = channelRef.current.presenceState();
      const myPresence = Object.values(state).flat()[0] || {};
      await channelRef.current.track({
        ...myPresence,
        currentView: viewName,
        onlineAt: new Date().toISOString(),
      });
    }
  }, [isConnected]);

  return {
    onlineUsers,
    isConnected,
    trackView,
  };
}
