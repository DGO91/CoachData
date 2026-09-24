// src/frontend/src/components/dashboard/ContentScheduledCard.jsx
import React from 'react';
import { Layers } from 'lucide-react';
import { useDashboardContent } from '../../hooks/useDashboardContent';
import { TRANSLATIONS } from '../../i18n/translations';

export function ContentScheduledCard({ organizationId, language = 'es' }) {
  const { scheduledNext30DaysCount, publishedThisWeekCount, loading } = useDashboardContent(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-kpi-skeleton" />;
  }

  return (
    <div className="ogd-kpi-card">
      <div className="ogd-kpi-header">
        <span>{t.growth_content}</span>
        <Layers size={16} style={{ color: '#10b981' }} />
      </div>
      <div className="ogd-kpi-value">{scheduledNext30DaysCount}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{t.next_30_days}</span>
        {publishedThisWeekCount > 0 && (
          <span style={{ color: '#10b981', fontWeight: 600 }}>+{publishedThisWeekCount} {t.this_week}</span>
        )}
      </div>
    </div>
  );
}
