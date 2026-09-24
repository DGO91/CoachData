// src/frontend/src/components/dashboard/FocusRecommendationsPanel.jsx
import React, { useMemo } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { useOperationsTasks } from '../../hooks/useOperationsTasks';
import { useDashboardProjects } from '../../hooks/useDashboardProjects';
import { useDashboardContent } from '../../hooks/useDashboardContent';
import { useOperationalHealth } from '../../hooks/useOperationalHealth';
import { TRANSLATIONS } from '../../i18n/translations';

export function FocusRecommendationsPanel({ organizationId, language = 'es', onNavigate }) {
  const { tasks, loading: loadingTasks } = useOperationsTasks(organizationId);
  const { projects, loading: loadingProjects } = useDashboardProjects(organizationId);
  const { contentItems, loading: loadingContent } = useDashboardContent(organizationId);
  const { score: ohsScore, loading: loadingOHS } = useOperationalHealth(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const recommendation = useMemo(() => {
    const loading = loadingTasks || loadingProjects || loadingContent || loadingOHS;
    if (loading) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Priority 1: High overdue tasks
    const highOverdue = tasks.filter(tk => tk.status !== 'completed' && tk.due_date && tk.priority === 'high' && tk.due_date < todayStr);
    if (highOverdue.length > 0) {
      return {
        title: language === 'es'
          ? `Cierra las ${highOverdue.length} tareas de alta prioridad vencidas`
          : `Close the ${highOverdue.length} overdue high-priority tasks`,
        description: language === 'es'
          ? 'Resolver los vencimientos críticos reducirá el riesgo operativo de tu organización.'
          : 'Resolving critical overdue tasks will reduce your organization\u2019s operational risk.',
        impact: language === 'es' ? '+15 puntos en OHS' : '+15 OHS points',
        targetTab: 'project-desk',
      };
    }

    // Priority 2: Stale active project
    const staleProjects = projects.filter(p => {
      const openProjectTasks = tasks.filter(tk => tk.project_id === p.id && tk.status !== 'completed');
      if (openProjectTasks.length === 0) return false;
      if (!p.updated_at) return true;
      const diffDays = (now - new Date(p.updated_at)) / (1000 * 60 * 60 * 24);
      return diffDays > 7;
    });

    if (staleProjects.length > 0) {
      return {
        title: language === 'es'
          ? `Avanza el proyecto inactivo "${staleProjects[0].name || 'Branding Sprint'}"`
          : `Advance the inactive project "${staleProjects[0].name || 'Branding Sprint'}"`,
        description: language === 'es'
          ? 'Se registran tareas abiertas sin movimiento durante la última semana.'
          : 'Open tasks have had no movement in the past week.',
        impact: language === 'es' ? '+10 puntos en OHS' : '+10 OHS points',
        targetTab: 'project-desk',
      };
    }

    // Priority 3: Content pipeline
    const scheduled30d = contentItems.filter(item => item.scheduled_date);
    if (scheduled30d.length === 0) {
      return {
        title: language === 'es'
          ? 'Planifica y agenda 3 piezas de contenido para Growth'
          : 'Plan and schedule 3 Growth content pieces',
        description: language === 'es'
          ? 'El pipeline de contenidos se encuentra vacío para las próximas semanas.'
          : 'The content pipeline is empty for the coming weeks.',
        impact: language === 'es' ? '+8 puntos en OHS' : '+8 OHS points',
        targetTab: 'content-desk',
      };
    }

    // Fallback Focus Priority
    return {
      title: language === 'es'
        ? 'Realiza el cierre operativo del día y revisa dossiers Pre-Call'
        : 'Complete the daily operational close and review Pre-Call dossiers',
      description: language === 'es'
        ? 'Tu organización se encuentra estabilizada. Optimiza las relaciones comerciales.'
        : 'Your organization is stable. Optimize commercial relationships.',
      impact: language === 'es' ? '+5 puntos en OHS' : '+5 OHS points',
      targetTab: 'reports-hub',
    };
  }, [tasks, projects, contentItems, ohsScore, loadingTasks, loadingProjects, loadingContent, loadingOHS, language]);

  if (!recommendation) {
    return <div className="ogd-panel-skeleton" style={{ height: '100px' }} />;
  }

  return (
    <div
      className="ogd-executive-focus-panel"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', gap: '3px', flex: '1 1 300px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-ink, var(--accent))', letterSpacing: '0.05em', textAlign: 'left' }}>
          {t.focus_recommendation || (language === 'es' ? 'Prioridad de Foco' : 'Today\'s Focus Priority')}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left', margin: 0 }}>
          {recommendation.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', margin: 0 }}>
          {recommendation.description} • <strong style={{ color: 'var(--good)' }}>{recommendation.impact}</strong>
        </div>
      </div>

      {onNavigate && recommendation.targetTab && (
        <button
          onClick={() => onNavigate(recommendation.targetTab)}
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-text, #ffffff)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span>{t.execute || (language === 'es' ? 'Ejecutar' : 'Execute')}</span>
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
