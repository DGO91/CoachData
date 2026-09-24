// src/frontend/src/hooks/useDashboardActivity.js
import { useState, useEffect, useMemo } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook de actividad en tiempo real conectado a task_activity_history (últimas 24 horas).
 */
export function useDashboardActivity(organizationId = null) {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let channel = null;
    // Referencia síncrona para la limpieza: ver comentario en useRealtimeTasks.
    // Con limpieza asíncrona, StrictMode remonta antes de eliminar el canal y
    // la suscripción queda muerta con "cannot add callbacks after subscribe()".
    let clienteSupabase = null;

    async function initActivity() {
      if (!organizationId) {
        if (isMounted) setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      clienteSupabase = supabase;
      if (!supabase || !isMounted) {
        if (isMounted) setLoading(false);
        return;
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      try {
        const { data, error } = await supabase
          .from('task_activity_history')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && Array.isArray(data) && isMounted) {
          setActivityLogs(data);
        } else if (isMounted) {
          setActivityLogs([]);
        }
      } catch (err) {
        console.error('[useDashboardActivity] Error cargando historial:', err);
        if (isMounted) setActivityLogs([]);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Si se desmontó mientras cargaba, no suscribimos: el canal quedaría
      // huérfano porque la limpieza ya corrió.
      if (!isMounted) return;

      // Suscripción Realtime para nuevos eventos de actividad
      channel = supabase
        .channel(`dashboard-activity-${organizationId}-${Math.random().toString(36).slice(2, 9)}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_activity_history',
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            if (!isMounted) return;
            if (payload.new) {
              setActivityLogs((prev) => {
                const safePrev = Array.isArray(prev) ? prev : [];
                return [payload.new, ...safePrev.slice(0, 29)];
              });
            }
          }
        )
        .subscribe();
    }

    initActivity();

    return () => {
      isMounted = false;
      if (clienteSupabase && channel) clienteSupabase.removeChannel(channel);
    };
  }, [organizationId]);

  const safeLogs = Array.isArray(activityLogs) ? activityLogs : [];

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tasksUpdatedTodayCount = safeLogs.filter((l) => l && l.created_at && l.created_at.startsWith(todayStr)).length;
    const activeUsersSet = new Set(safeLogs.map((l) => l && l.actor_name).filter(Boolean));

    return {
      recentActivity: safeLogs,
      tasksUpdatedTodayCount,
      activeUsersCount: activeUsersSet.size,
    };
  }, [safeLogs]);

  return {
    recentActivity: safeLogs,
    tasksUpdatedTodayCount: metrics.tasksUpdatedTodayCount,
    activeUsersCount: metrics.activeUsersCount,
    loading,
  };
}
