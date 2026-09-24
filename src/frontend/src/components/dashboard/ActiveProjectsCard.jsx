// src/frontend/src/components/dashboard/ActiveProjectsCard.jsx
import React from 'react';
import { FolderKanban } from 'lucide-react';
import { useDashboardProjects } from '../../hooks/useDashboardProjects';
import { TRANSLATIONS } from '../../i18n/translations';

export function ActiveProjectsCard({ organizationId, tasks = [], language = 'es' }) {
  const { activeProjectsCount, pausedProjectsCount, loading } = useDashboardProjects(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-kpi-skeleton" />;
  }

  return (
    <div className="ogd-kpi-card">
      <div className="ogd-kpi-header">
        <span>{t.active_projects}</span>
        <FolderKanban size={16} style={{ color: '#f59e0b' }} />
      </div>
      <div className="ogd-kpi-value">{activeProjectsCount}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t.in_execution}</span>
        {pausedProjectsCount > 0 && (
          <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '1px 6px', borderRadius: '4px', fontSize: '10px' }}>
            {pausedProjectsCount} {t.paused}
          </span>
        )}
      </div>
    </div>
  );
}
