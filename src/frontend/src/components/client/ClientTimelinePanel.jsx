// src/frontend/src/components/client/ClientTimelinePanel.jsx
import React from 'react';
import { Clock, CheckCircle2, RefreshCw, PlusCircle } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function ClientTimelinePanel({ activityHistory = [], language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const safeHistory = Array.isArray(activityHistory) ? activityHistory : [];

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'TASK_COMPLETED': return <CheckCircle2 size={14} style={{ color: 'var(--good, #22c55e)' }} />;
      case 'TASK_UPDATED': return <RefreshCw size={14} style={{ color: 'var(--warn, #f59e0b)' }} />;
      default: return <PlusCircle size={14} style={{ color: 'var(--accent-ink, var(--accent))' }} />;
    }
  };

  return (
    <div className="ogd-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <div className="ogd-panel-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.activity_timeline}</span>
        </div>
      </div>

      {safeHistory.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t.noRecentActivity}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {safeHistory.map((item, idx) => (
            <div key={item?.id || idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ marginTop: '2px' }}>{getActionIcon(item?.action_type)}</div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item?.actor_name || 'Equipo CoachData'} — {item?.action_type || 'Acción'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {item?.created_at ? new Date(item.created_at).toLocaleString() : 'Recientemente'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
