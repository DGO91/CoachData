// src/frontend/src/hooks/useExecutiveInsights.js
import { useMemo } from 'react';
import { useOperationsTasks } from './useOperationsTasks';
import { useDashboardProjects } from './useDashboardProjects';
import { useDashboardContent } from './useDashboardContent';
import { useDashboardAIActivity } from './useDashboardAIActivity';
import { useOperationalHealth } from './useOperationalHealth';

/**
 * Custom Hook: useExecutiveInsights
 * Generates prioritized executive insights for founders/directors.
 * Accepts `language` ('es' | 'en') to return bilingual content strings.
 */
export function useExecutiveInsights(organizationId, language = 'es') {
  const { tasks, loading: loadingTasks } = useOperationsTasks(organizationId);
  const { projects, loading: loadingProjects } = useDashboardProjects(organizationId);
  const { contentItems, loading: loadingContent } = useDashboardContent(organizationId);
  const { aiActivity, loading: loadingAI } = useDashboardAIActivity(organizationId);
  const { score: ohsScore, loading: loadingOHS } = useOperationalHealth(organizationId);

  const isEs = language === 'es';

  return useMemo(() => {
    const loading = loadingTasks || loadingProjects || loadingContent || loadingAI || loadingOHS;
    if (loading) {
      return { insights: [], loading: true };
    }

    const rawInsights = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Insight 1: High-priority task delays
    const highOverdue = tasks.filter(t => t.status !== 'completed' && t.due_date && t.priority === 'high' && t.due_date < todayStr);
    if (highOverdue.length > 0) {
      rawInsights.push({
        id: 'ins-overdue-high',
        type: 'focus',
        priority: 'high',
        title: isEs ? 'Riesgo de retraso crítico detectado' : 'Critical delay risk detected',
        description: isEs
          ? `Existen ${highOverdue.length} tareas de alta prioridad vencidas en tu panel operativo.`
          : `There are ${highOverdue.length} overdue high-priority tasks in your operational panel.`,
        action: isEs ? 'Reasignar tareas hoy' : 'Reassign tasks today',
        targetTab: 'project-desk',
      });
    }

    // Insight 2: Content Pipeline
    const scheduled30d = contentItems.filter(item => {
      if (!item.scheduled_date) return false;
      const scheduled = new Date(item.scheduled_date);
      const diffDays = (scheduled - now) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 30;
    });

    if (scheduled30d.length < 3) {
      rawInsights.push({
        id: 'ins-content-pipeline',
        type: 'growth',
        priority: 'medium',
        title: isEs ? 'Pipeline de contenido en riesgo' : 'Content pipeline at risk',
        description: isEs
          ? `Solo hay ${scheduled30d.length} pieza(s) de contenido programada(s) para los próximos 30 días.`
          : `Only ${scheduled30d.length} content piece(s) scheduled for the next 30 days.`,
        action: isEs ? 'Planificar 3 contenidos esta semana' : 'Plan 3 content pieces this week',
        targetTab: 'content-desk',
      });
    }

    // Insight 3: AI Orchestrator Adoption
    if (aiActivity.length === 0) {
      rawInsights.push({
        id: 'ins-ai-adoption',
        type: 'intelligence',
        priority: 'medium',
        title: isEs ? 'Oportunidad de automatización IA' : 'AI automation opportunity',
        description: isEs
          ? 'No se registran ejecuciones activas del AI Orchestrator esta semana.'
          : 'No active AI Orchestrator executions recorded this week.',
        action: isEs ? 'Activar Agente de Resumen Matutino' : 'Activate Morning Briefing Agent',
        targetTab: 'agents-hub',
      });
    }

    // Insight 4: High OHS Momentum
    if (ohsScore >= 85) {
      rawInsights.push({
        id: 'ins-ohs-momentum',
        type: 'momentum',
        priority: 'low',
        title: isEs ? 'Excelente estabilidad operativa' : 'Excellent operational stability',
        description: isEs
          ? `La organización mantiene un OHS de ${ohsScore}/100. Es momento óptimo para escalar proyectos.`
          : `The organization maintains an OHS of ${ohsScore}/100. Optimal time to scale projects.`,
        action: isEs ? 'Crear nuevo proyecto de expansión' : 'Create new expansion project',
        targetTab: 'project-desk',
      });
    }

    // Fallback Insight if empty
    if (rawInsights.length === 0) {
      rawInsights.push({
        id: 'ins-stable-ops',
        type: 'focus',
        priority: 'low',
        title: isEs ? 'Operativa estabilizada' : 'Operations stabilized',
        description: isEs
          ? 'Todos los flujos clave se mantienen dentro de los parámetros esperados.'
          : 'All key flows remain within expected parameters.',
        action: isEs ? 'Revisar métricas semanales' : 'Review weekly metrics',
        targetTab: 'reports-hub',
      });
    }

    // Sort by priority (high > medium > low) and limit to max 3
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const insights = rawInsights
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
      .slice(0, 3);

    return {
      insights,
      loading: false,
    };
  }, [tasks, projects, contentItems, aiActivity, ohsScore, language, loadingTasks, loadingProjects, loadingContent, loadingAI, loadingOHS]);
}
