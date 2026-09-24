// src/frontend/src/hooks/useRealtimeTasks.js
import { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook de suscripción en tiempo real a Supabase Realtime Channels para Operations Tasks.
 * Filtra eventos exclusivamente por organization_id y evita duplicados en eventos INSERT.
 */
export function useRealtimeTasks(organizationId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel = null;
    let isMounted = true;
    // Guardamos el cliente para poder limpiar de forma SÍNCRONA. Si la
    // limpieza es asíncrona (`getSupabase().then(...)`), con StrictMode el
    // efecto se remonta antes de que el canal anterior se haya eliminado,
    // `supabase.channel(mismoNombre)` devuelve el canal ya suscrito y `.on()`
    // lanza "cannot add postgres_changes callbacks after subscribe()".
    // Resultado: la suscripción en tiempo real quedaba muerta.
    let clienteSupabase = null;

    async function initRealtime() {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      clienteSupabase = supabase;
      if (!supabase) {
        setLoading(false);
        return;
      }

      // 1. Carga inicial de tareas filtradas por organización
      try {
        const { data, error } = await supabase
          .from('operations_tasks')
          .select('*')
          .eq('organization_id', organizationId)
          .order('order_index', { ascending: true });

        if (!error && Array.isArray(data) && isMounted) {
          setTasks(data);
        } else if (isMounted) {
          setTasks([]);
        }
      } catch (err) {
        console.error('[useRealtimeTasks] Error cargando tareas iniciales:', err);
        if (isMounted) setTasks([]);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Si el componente se desmontó mientras cargaban los datos, no llegamos
      // a suscribir: si no, el canal queda huérfano porque la limpieza ya corrió.
      if (!isMounted) return;

      // 2. Suscripción a canal Supabase Realtime con filtro por organization_id
      // El sufijo aleatorio evita que dos instancias del hook (o un remonte)
      // choquen sobre el mismo nombre de canal.
      channel = supabase
        .channel(`operations-tasks-org-${organizationId}-${Math.random().toString(36).slice(2, 9)}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Escuchar INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'operations_tasks',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            console.log('[Realtime Event]', payload);

            if (!isMounted) return;

            if (payload.eventType === 'INSERT') {
              setTasks((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                const exists = safePrev.some((t) => t.id === payload.new.id);
                return exists ? safePrev : [payload.new, ...safePrev];
              });
            } else if (payload.eventType === 'UPDATE') {
              setTasks((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t));
              });
            } else if (payload.eventType === 'DELETE') {
              setTasks((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return safePrev.filter((t) => t.id !== payload.old.id);
              });
            }
          }
        )
        .subscribe();
    }

    initRealtime();

    return () => {
      isMounted = false;
      if (clienteSupabase && channel) clienteSupabase.removeChannel(channel);
    };
  }, [organizationId]);

  return { tasks: Array.isArray(tasks) ? tasks : [], setTasks, loading };
}
