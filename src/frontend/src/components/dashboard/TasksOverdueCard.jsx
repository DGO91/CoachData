// src/frontend/src/components/dashboard/TasksOverdueCard.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function TasksOverdueCard({ tasks = [], language = 'es' }) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = safeTasks.filter(
    (t) => t && t.status !== 'done' && t.status !== 'completed' && t.due_date && t.due_date < today
  ).length;
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  return (
    <div className="ogd-kpi-card" style={{ borderColor: overdueCount > 0 ? 'rgba(239, 68, 68, 0.3)' : undefined }}>
      <div className="ogd-kpi-header">
        <span>{t.overdue_tasks}</span>
        <AlertCircle size={16} style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--text-muted, #64748b)' }} />
      </div>
      <div className="ogd-kpi-value" style={{ color: overdueCount > 0 ? '#ef4444' : undefined }}>
        {overdueCount}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>{t.urgent_attention}</div>
    </div>
  );
}
