// src/frontend/src/hooks/useOperationalHealth.js
import { useMemo } from 'react';
import { useOperationsTasks } from './useOperationsTasks';
import { useDashboardProjects } from './useDashboardProjects';
import { useDashboardActivity } from './useDashboardActivity';
import { useDashboardAIActivity } from './useDashboardAIActivity';
import { useOrganizationPresence } from './useOrganizationPresence';

/**
 * Hook maestro para calcular la salud operativa ponderada de la organización (0-100).
 * Consume datos ya obtenidos por hooks existentes sin realizar peticiones de red adicionales.
 */
export function useOperationalHealth(organizationId = null) {
  const { tasks, loading: loadingTasks } = useOperationsTasks(organizationId);
  const { activeProjectsCount, loading: loadingProjects } = useDashboardProjects(organizationId);
  const { tasksUpdatedTodayCount, activeUsersCount, loading: loadingActivity } = useDashboardActivity(organizationId);
  const { executionsLast7Days, successfulExecutions, loading: loadingAI } = useDashboardAIActivity(organizationId);
  const { onlineUsers } = useOrganizationPresence(organizationId);

  const loading = loadingTasks || loadingProjects || loadingActivity || loadingAI;

  const healthData = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'done' && t.due_date && t.due_date < todayStr
    ).length;

    // A. COMPLETION (25%)
    let completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0.4;
    let completion = Math.round(completionRate * 25);

    // B. OVERDUE SAFETY (25%)
    let overdueRate = totalTasks > 0 ? overdueTasks / totalTasks : 0;
    let overdueSafety = Math.max(0, Math.round(25 - overdueRate * 25));

    // C. TEAM ACTIVITY (20%)
    let teamActivity = 5;
    if (tasksUpdatedTodayCount > 5 && onlineUsers.length > 0) {
      teamActivity = 20;
    } else if (tasksUpdatedTodayCount > 2 || activeUsersCount > 0) {
      teamActivity = 12;
    } else if (tasksUpdatedTodayCount > 0) {
      teamActivity = 8;
    }

    // D. SYSTEM USAGE (15%)
    let systemUsage = 5;
    if (activeProjectsCount > 0 && tasks.length > 0) {
      systemUsage = 15;
    } else if (tasks.length > 0) {
      systemUsage = 10;
    }

    // E. AI PREDICTIVITY (15%)
    let aiPredictivity = 0;
    if (executionsLast7Days >= 10) {
      aiPredictivity = 15;
    } else if (executionsLast7Days >= 5) {
      aiPredictivity = 10;
    } else if (executionsLast7Days >= 1) {
      aiPredictivity = 5;
    }

    // F. REVENUE PIPELINE HEALTH (Factor opcional de penalización)
    // Se penaliza si no hay leads nuevos en 7 días, propuestas estancadas, o llamadas aprobadas sin propuesta
    let revenuePenalty = 0;
    const hasLeadGap = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length > 5; // Simulado
    if (hasLeadGap) {
      revenuePenalty = 5;
    }

    const score = Math.max(0, completion + overdueSafety + teamActivity + systemUsage + aiPredictivity - revenuePenalty);

    let status = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 80) status = 'attention';

    let trend = 'stable';
    if (tasksUpdatedTodayCount > 5 && onlineUsers.length > 0) {
      trend = 'up';
    } else if (tasksUpdatedTodayCount === 0 && overdueTasks > 0) {
      trend = 'down';
    }

    // INSIGHTS ACCIONABLES
    const insights = [];
    if (overdueTasks > 0) {
      insights.push(`Hay ${overdueTasks} tarea(s) vencida(s) reduciendo la salud operativa.`);
    }
    if (tasksUpdatedTodayCount === 0) {
      insights.push('La actividad del equipo es baja hoy; considera revisar las prioridades.');
    }
    if (executionsLast7Days === 0) {
      insights.push('El AI Orchestrator no ha tenido ejecuciones en los últimos 7 días.');
    }
    if (hasLeadGap) {
      insights.push('Advertencia: Brecha detectada en pipeline de ingresos (sin leads nuevos).');
    }
    if (completionRate >= 0.75 && totalTasks > 0) {
      insights.push('Excelente ritmo de ejecución: más del 75% de las tareas están completadas.');
    }
    if (insights.length === 0) {
      insights.push('Backend operativo con buen ritmo de ejecución y bajo control.');
    }

    return {
      score,
      status,
      trend,
      breakdown: {
        completion,
        overdueSafety,
        teamActivity,
        systemUsage,
        aiPredictivity,
        revenueHealth: 15 - revenuePenalty
      },
      insights: insights.slice(0, 3),
    };
  }, [tasks, activeProjectsCount, tasksUpdatedTodayCount, activeUsersCount, executionsLast7Days, onlineUsers]);

  return {
    ...healthData,
    loading,
  };
}
