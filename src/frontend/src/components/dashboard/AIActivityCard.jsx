// src/frontend/src/components/dashboard/AIActivityCard.jsx
import React from 'react';
import { Bot, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useDashboardAIActivity } from '../../hooks/useDashboardAIActivity';
import { TRANSLATIONS } from '../../i18n/translations';

export function AIActivityCard({ organizationId, language = 'es' }) {
  const { executionsLast7Days, mostUsedAgent, lastExecutionAt, loading } = useDashboardAIActivity(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-kpi-skeleton" />;
  }

  const formatRelativeTime = (isoString) => {
    if (!isoString) return t.no_executions_yet;
    const diffMin = Math.floor((new Date() - new Date(isoString)) / (1000 * 60));
    if (diffMin < 60) return `${diffMin}${t.mins_ago || 'm'}`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}${t.hours_ago || 'h'}`;
    return `${Math.floor(diffHours / 24)}${t.days_ago || 'd'}`;
  };

  let stateColor = 'var(--accent-ink, var(--accent))';
  let stateDesc = executionsLast7Days > 0
    ? (language === 'es' ? `Última ejecución: ${formatRelativeTime(lastExecutionAt)}` : `Last run: ${formatRelativeTime(lastExecutionAt)}`)
    : (language === 'es' ? 'Agentes listos para automatizar tareas.' : 'Agents ready to automate tasks.');
  let StatusIcon = Bot;

  return (
    <div className="ogd-kpi-card">
      <div className="ogd-kpi-header">
        <span>{t.ai_orchestrator}</span>
        <Bot size={16} style={{ color: stateColor }} />
      </div>
      <div className="ogd-kpi-value" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <StatusIcon size={18} style={{ color: stateColor }} />
        <span>{executionsLast7Days} {t.aiOrchestratorExecutions}</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>{stateDesc}</div>
    </div>
  );
}
