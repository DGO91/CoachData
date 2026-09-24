// src/frontend/src/hooks/useDashboardAIActivity.js
import { useState, useEffect, useMemo } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook para métricas de ejecuciones del AI Orchestrator.
 */
export function useDashboardAIActivity(organizationId) {
  const [aiLogs, setAiLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAILogs() {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
          .from('ai_agent_logs')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', sevenDaysAgo.toISOString());

        if (!error && Array.isArray(data) && isMounted) {
          setAiLogs(data);
        } else if (isMounted) {
          setAiLogs([]);
        }
      } catch (err) {
        console.error('[useDashboardAIActivity] Error cargando logs IA:', err);
        if (isMounted) setAiLogs([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAILogs();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const metrics = useMemo(() => {
    const safeLogs = Array.isArray(aiLogs) ? aiLogs : [];
    const executionsLast7Days = safeLogs.length;
    const successfulExecutions = safeLogs.filter((l) => l && l.status === 'success').length;
    const failedExecutions = safeLogs.filter((l) => l && l.status === 'failed').length;

    return {
      executionsLast7Days,
      successfulExecutions,
      failedExecutions,
      aiLogs: safeLogs,
    };
  }, [aiLogs]);

  return {
    aiActivity: metrics.aiLogs,
    executionsLast7Days: metrics.executionsLast7Days,
    successfulExecutions: metrics.successfulExecutions,
    failedExecutions: metrics.failedExecutions,
    loading,
  };
}
