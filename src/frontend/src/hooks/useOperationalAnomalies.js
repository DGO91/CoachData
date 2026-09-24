// src/frontend/src/hooks/useOperationalAnomalies.js
import { useMemo } from 'react';
import { useOperationsTasks } from './useOperationsTasks';
import { useDashboardProjects } from './useDashboardProjects';
import { useDashboardContent } from './useDashboardContent';
import { useDashboardAIActivity } from './useDashboardAIActivity';
import { useOrganizationPresence } from './useOrganizationPresence';
import { useOperationalHealth } from './useOperationalHealth';

/**
 * Custom Hook: useOperationalAnomalies
 * Detects critical and moderate operational anomalies from in-memory hooks without extra DB queries.
 * Accepts `language` ('es' | 'en') to support localized strings.
 */
export function useOperationalAnomalies(organizationId, language = 'es') {
  const { tasks, loading: loadingTasks } = useOperationsTasks(organizationId);
  const { projects, loading: loadingProjects } = useDashboardProjects(organizationId);
  const { contentItems, loading: loadingContent } = useDashboardContent(organizationId);
  const { aiActivity, loading: loadingAI } = useDashboardAIActivity(organizationId);
  const { onlineUsers } = useOrganizationPresence(organizationId);
  const { score: ohsScore, loading: loadingOHS } = useOperationalHealth(organizationId);

  const isEs = language === 'es';

  return useMemo(() => {
    const loading = loadingTasks || loadingProjects || loadingContent || loadingAI || loadingOHS;
    if (loading) {
      return {
        critical: [],
        warnings: [],
        healthySignals: [],
        anomalyScore: 100,
        loading: true,
      };
    }

    const critical = [];
    const warnings = [];
    const healthySignals = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. CRITICAL ANOMALIES
    // a. High Priority Overdue Tasks > 3
    const highPriorityOverdue = tasks.filter(t => {
      if (t.status === 'completed' || t.status === 'done') return false;
      if (!t.due_date) return false;
      return t.priority === 'high' && t.due_date < todayStr;
    });

    if (highPriorityOverdue.length >= 3) {
      critical.push({
        id: 'crit-overdue-high',
        title: isEs ? 'Acumulación de Tareas Críticas Vencidas' : 'Accumulation of Critical Overdue Tasks',
        description: isEs
          ? `Existen ${highPriorityOverdue.length} tareas de alta prioridad vencidas que requieren intervención.`
          : `There are ${highPriorityOverdue.length} overdue high-priority tasks requiring intervention.`,
        code: 'HIGH_OVERDUE_ACCUMULATION',
      });
    }

    // b. Stale Project > 7 days with open tasks
    const staleProjects = projects.filter(p => {
      const openProjectTasks = tasks.filter(t => t.project_id === p.id && t.status !== 'completed');
      if (openProjectTasks.length === 0) return false;
      if (!p.updated_at) return true;
      const lastUpdate = new Date(p.updated_at);
      const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    });

    if (staleProjects.length > 0) {
      critical.push({
        id: 'crit-stale-projects',
        title: isEs ? 'Proyectos Inactivos con Pendientes' : 'Inactive Projects with Pending Work',
        description: isEs
          ? `${staleProjects.length} proyecto(s) sin actividad registrada en los últimos 7 días.`
          : `${staleProjects.length} project(s) with no activity recorded in the last 7 days.`,
        code: 'STALE_PROJECT_DETECTED',
      });
    }

    // c. OHS Score < 50
    if (ohsScore < 50) {
      critical.push({
        id: 'crit-ohs-low',
        title: isEs ? 'Salud Operativa en Nivel Crítico' : 'Operational Health at Critical Level',
        description: isEs
          ? `El OHS actual (${ohsScore}/100) indica vulnerabilidad en ejecución y vencimientos.`
          : `The current OHS (${ohsScore}/100) indicates vulnerability in execution and deadlines.`,
        code: 'OHS_BELOW_THRESHOLD',
      });
    }

    // 2. MODERATE ANOMALIES (WARNINGS)
    // a. More than 8 open tasks in a single project
    const projectTaskCounts = {};
    tasks.forEach(t => {
      if (t.status !== 'completed' && t.project_id) {
        projectTaskCounts[t.project_id] = (projectTaskCounts[t.project_id] || 0) + 1;
      }
    });

    const overloadedProjects = Object.values(projectTaskCounts).filter(count => count > 8);
    if (overloadedProjects.length > 0) {
      warnings.push({
        id: 'warn-overloaded-project',
        title: isEs ? 'Sobrecarga de Tareas por Proyecto' : 'Task Overload per Project',
        description: isEs
          ? 'Existen proyectos con más de 8 tareas abiertas simultáneamente.'
          : 'There are projects with more than 8 open tasks simultaneously.',
        code: 'PROJECT_OVERLOAD',
      });
    }

    // b. No scheduled content in next 14 days
    const upcomingContent = contentItems.filter(item => {
      if (!item.scheduled_date) return false;
      const scheduled = new Date(item.scheduled_date);
      const diffDays = (scheduled - now) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 14;
    });

    if (upcomingContent.length === 0) {
      warnings.push({
        id: 'warn-no-content-14d',
        title: isEs ? 'Vacío en Pipeline de Contenido (14 días)' : 'Gap in Content Pipeline (14 days)',
        description: isEs
          ? 'No hay piezas de contenido agendadas para las próximas dos semanas.'
          : 'No content pieces scheduled for the next two weeks.',
        code: 'CONTENT_PIPELINE_DRY',
      });
    }

    // c. AI Orchestrator without executions in 5 days
    const recentAIExecs = aiActivity.filter(log => {
      if (!log.created_at) return false;
      const execDate = new Date(log.created_at);
      const diffDays = (now - execDate) / (1000 * 60 * 60 * 24);
      return diffDays <= 5;
    });

    if (recentAIExecs.length === 0) {
      warnings.push({
        id: 'warn-ai-idle',
        title: isEs ? 'Inactividad de Agentes IA' : 'AI Agent Inactivity',
        description: isEs
          ? 'El AI Orchestrator no ha registrado ejecuciones en los últimos 5 días.'
          : 'The AI Orchestrator has not registered executions in the last 5 days.',
        code: 'AI_ORCHESTRATOR_IDLE',
      });
    }

    // d. Zero users online during workday
    if (onlineUsers.length === 0) {
      warnings.push({
        id: 'warn-no-online-users',
        title: isEs ? 'Sin Presencia de Equipo Detectada' : 'No Team Presence Detected',
        description: isEs
          ? 'No se registran colaboradores activos en la sesión actual.'
          : 'No active collaborators registered in the current session.',
        code: 'NO_PRESENCE_DETECTED',
      });
    }

    // 3. HEALTHY SIGNALS
    if (critical.length === 0) {
      healthySignals.push(isEs ? 'Sin riesgos críticos de ejecución en la organización.' : 'No critical execution risks in the organization.');
    }
    if (ohsScore >= 80) {
      healthySignals.push(isEs ? `Salud Operativa Sobresaliente (${ohsScore}/100).` : `Outstanding Operational Health (${ohsScore}/100).`);
    }
    if (upcomingContent.length > 0) {
      healthySignals.push(isEs
        ? `Pipeline de contenido activo con ${upcomingContent.length} piezas agendadas.`
        : `Active content pipeline with ${upcomingContent.length} scheduled pieces.`
      );
    }

    // Calculate Anomaly Score (100 - penalties)
    const penalty = (critical.length * 20) + (warnings.length * 8);
    const anomalyScore = Math.max(0, 100 - penalty);

    return {
      critical,
      warnings,
      healthySignals,
      anomalyScore,
      loading: false,
    };
  }, [tasks, projects, contentItems, aiActivity, onlineUsers, ohsScore, language, loadingTasks, loadingProjects, loadingContent, loadingAI, loadingOHS]);
}
