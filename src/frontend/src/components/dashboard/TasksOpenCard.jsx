// src/frontend/src/components/dashboard/TasksOpenCard.jsx
import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function TasksOpenCard({ tasks = [], language = 'es' }) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const openCount = safeTasks.filter((t) => t && t.status !== 'done' && t.status !== 'completed').length;
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  return (
    <div className="ogd-kpi-card">
      <div className="ogd-kpi-header">
        <span>{t.open_tasks}</span>
        <CheckCircle2 size={16} style={{ color: '#38bdf8' }} />
      </div>
      <div className="ogd-kpi-value">{openCount}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>{t.openTasksSub}</div>
    </div>
  );
}
