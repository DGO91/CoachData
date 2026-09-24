// src/frontend/src/hooks/useOperationalRisks.js
import { useMemo } from 'react';
import { useOperationsTasks } from './useOperationsTasks';
import { useDashboardProjects } from './useDashboardProjects';
import { useDashboardContent } from './useDashboardContent';
import { useDashboardAIActivity } from './useDashboardAIActivity';
import { useOperationalHealth } from './useOperationalHealth';

/**
 * Hook para consolidar Riesgos Operativos y Señales Saludables con soporte bilingüe.
 */
export function useOperationalRisks(organizationId, language = 'es') {
  const { tasks = [], loading: loadingTasks } = useOperationsTasks(organizationId);
  const { activeProjectsCount, pausedProjectsCount, staleProjectsCount, loading: loadingProjects } = useDashboardProjects(organizationId);
  const { scheduledNext30DaysCount, loading: loadingContent } = useDashboardContent(organizationId);
  const { executionsLast7Days, loading: loadingAI } = useDashboardAIActivity(organizationId);
  const { score: ohsScore, loading: loadingOHS } = useOperationalHealth(organizationId);

  const isEs = language === 'es';

  return useMemo(() => {
    const loading = loadingTasks || loadingProjects || loadingContent || loadingAI || loadingOHS;

    const criticalRisks = [];
    const attentionRequired = [];
    const healthySignals = [];

    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Tareas críticas vencidas
    const criticalOverdue = safeTasks.filter(
      (t) => t && t.status !== 'done' && t.due_date && t.priority === 'high' && t.due_date < todayStr
    );

    if (criticalOverdue.length > 0) {
      criticalRisks.push({
        id: 'risk-critical-overdue',
        title: isEs 
          ? `${criticalOverdue.length} Tareas de alta prioridad vencidas`
          : `${criticalOverdue.length} Overdue high-priority tasks`,
        desc: isEs
          ? 'Requieren reasignación o resolución inmediata para evitar cuellos de botella.'
          : 'Require immediate reassignment or resolution to avoid bottlenecks.',
        badge: isEs ? 'Crítico' : 'Critical',
      });
    }

    // 2. Proyectos inactivos / estancados
    if (staleProjectsCount > 0) {
      attentionRequired.push({
        id: 'risk-stale-projects',
        title: isEs
          ? `${staleProjectsCount} Proyecto(s) sin actividad reciente`
          : `${staleProjectsCount} Project(s) with no recent activity`,
        desc: isEs
          ? 'Proyectos activos sin actualización registrada en los últimos 7 días.'
          : 'Active projects with no updates recorded in the last 7 days.',
        badge: isEs ? 'Atención' : 'Attention',
      });
    }

    // 3. AI Orchestrator bajo uso
    if (executionsLast7Days < 3) {
      attentionRequired.push({
        id: 'risk-low-ai-usage',
        title: isEs ? 'Baja frecuencia de uso de IA' : 'Low AI usage frequency',
        desc: isEs
          ? 'Solo se registraron pocas ejecuciones de agentes esta semana.'
          : 'Only a few agent executions recorded this week.',
        badge: isEs ? 'Atención' : 'Attention',
      });
    }

    // 4. Pipeline de contenidos sin agendar
    if (scheduledNext30DaysCount === 0) {
      attentionRequired.push({
        id: 'risk-no-content',
        title: isEs ? 'Pipeline de contenido vacío para 30 días' : 'Empty 30-day content pipeline',
        desc: isEs
          ? 'No hay piezas programadas para la estrategia de contenido de los próximos 30 días.'
          : 'No scheduled pieces for the content strategy in the next 30 days.',
        badge: isEs ? 'Atención' : 'Attention',
      });
    }

    // 5. Señales saludables
    if (criticalOverdue.length === 0) {
      healthySignals.push({
        id: 'signal-no-critical-overdue',
        title: isEs ? 'Cero tareas de alta prioridad vencidas' : 'Zero overdue high-priority tasks',
        desc: isEs ? 'La cola de tareas críticas se encuentra al día.' : 'The critical tasks queue is up to date.',
      });
    }

    if (activeProjectsCount > 0 && staleProjectsCount === 0) {
      healthySignals.push({
        id: 'signal-active-projects-moving',
        title: isEs ? 'Todos los proyectos activos presentan movimiento' : 'All active projects are showing activity',
        desc: isEs 
          ? 'No se registran proyectos estancados durante la última semana.'
          : 'No projects recorded as stale during the last week.',
      });
    }

    if (scheduledNext30DaysCount >= 3) {
      healthySignals.push({
        id: 'signal-content-healthy',
        title: isEs ? 'Pipeline de contenido asegurado' : 'Secured content pipeline',
        desc: isEs 
          ? 'Existen piezas de contenido agendadas para los próximos 30 días.'
          : 'There are content pieces scheduled for the next 30 days.',
      });
    }

    const completedTasksCount = safeTasks.filter((t) => t && t.status === 'done').length;
    if (completedTasksCount > 0) {
      healthySignals.push({
        id: 'signal-completed-tasks',
        title: isEs
          ? `${completedTasksCount} Tarea(s) completada(s)`
          : `${completedTasksCount} Completed task(s)`,
        desc: isEs
          ? 'El flujo de ejecución mantiene avance constante.'
          : 'The execution flow maintains constant progress.',
      });
    }

    return {
      criticalRisks,
      attentionRequired,
      healthySignals,
      loading,
    };
  }, [
    tasks,
    activeProjectsCount,
    pausedProjectsCount,
    staleProjectsCount,
    scheduledNext30DaysCount,
    executionsLast7Days,
    ohsScore,
    language,
    loadingTasks,
    loadingProjects,
    loadingContent,
    loadingAI,
    loadingOHS,
  ]);
}
