// src/frontend/src/components/client/ClientProjectOverview.jsx
import React from 'react';
import { Layout, CheckCircle, Clock } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function ClientProjectOverview({ project, tasks = [], language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'done');
  const progressPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 100;

  return (
    <div className="ogd-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(184, 152, 90, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-ink, var(--accent))' }}>
            <Layout size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {project?.title || 'Proyecto Cliente de Elite'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {project?.description || 'Espacio privado de seguimiento y aprobaciones.'}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.project_progress}</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-ink, var(--accent))' }}>{progressPct}%</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '6px', background: 'var(--bg-root)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} style={{ color: 'var(--good, #22c55e)' }} />
          <span>Completadas: <strong style={{ color: 'var(--text-primary)' }}>{completedTasks.length}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: 'var(--warn, #f59e0b)' }} />
          <span>En Progreso: <strong style={{ color: 'var(--text-primary)' }}>{totalTasks - completedTasks.length}</strong></span>
        </div>
      </div>
    </div>
  );
}
