// src/frontend/src/components/dashboard/DailyWinsPanel.jsx
import React from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { useDashboardActivity } from '../../hooks/useDashboardActivity';
import { TRANSLATIONS } from '../../core/constants/app.constants';

export function DailyWinsPanel({ organizationId, tasks = [], language = 'es' }) {
  const { recentActivity = [], loading } = useDashboardActivity(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const safeActivity = Array.isArray(recentActivity) ? recentActivity : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Filtrar eventos de task_activity_history que corresponden a victorias/cambios a Done
  const winEvents = safeActivity
    .filter((a) => a && a.action_type === 'status_changed' && a.new_value?.status === 'done')
    .slice(0, 5);

  // Fallback a tareas completadas si aún no hay suficientes logs de auditoría
  const completedTasks = safeTasks.filter((t) => t && (t.status === 'done' || t.status === 'completed')).slice(0, 5);

  const displayWins = winEvents.length > 0
    ? winEvents.map((w) => ({
        id: w.id,
        title: w.field_name ? `${t.task_completed_by || 'Tarea finalizada por'} ${w.actor_name}` : `Done`,
        actor: w.actor_name,
        time: new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    : completedTasks.map((task) => ({
        id: task.id,
        title: task.title,
        actor: t.team || 'Team',
        time: t.today || 'Today',
      }));

  return (
    <div className="ogd-panel ogd-daily-wins-panel">
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={18} style={{ color: 'var(--accent, #f59e0b)' }} />
          <span>{t.daily_wins || 'Daily Wins & Hitos Completados'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayWins.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
            {t.no_daily_wins || 'Sin tareas completadas hoy.'}
          </div>
        ) : (
          displayWins.map((win) => (
            <div
              key={win.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--bg-muted, rgba(255,255,255,0.03))',
                borderRadius: '10px',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--good, #22c55e)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{win.title}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{win.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
