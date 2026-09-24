// src/frontend/src/components/dashboard/TeamActivityPanel.jsx
import React from 'react';
import { Users, Activity } from 'lucide-react';
import { useDashboardActivity } from '../../hooks/useDashboardActivity';
import { TRANSLATIONS } from '../../i18n/translations';

export function TeamActivityPanel({ organizationId, language = 'es' }) {
  const { recentActivity, activeUsersCount, loading } = useDashboardActivity(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  // Agrupar actividades recientes por usuario
  const userSummary = {};
  recentActivity.forEach((act) => {
    const actor = act.actor_name || (t.unknown || (language === 'es' ? 'Desconocido' : 'Unknown'));
    if (!userSummary[actor]) {
      userSummary[actor] = { count: 0, lastAction: act.action_type, lastTime: act.created_at };
    }
    userSummary[actor].count += 1;
  });

  const activeUserList = Object.entries(userSummary);

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  return (
    <div className="ogd-panel" style={{ marginTop: '16px' }}>
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: '#38bdf8' }} />
          <span>{t.team_activity_24h}</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
          {activeUsersCount} {t.active_users}
        </span>
      </div>

      {activeUserList.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '12px', fontStyle: 'italic' }}>
          {t.no_team_activity_24h}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeUserList.map(([name, data]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} style={{ color: '#38bdf8' }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary, #f1f5f9)' }}>{name}</span>
              </div>
              <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
                {data.count} {t.actions || (language === 'es' ? 'acciones' : 'actions')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '11px' }}>
                  {data.count} {t.actions || (language === 'es' ? 'acciones' : 'actions')}
                </span>
                <span style={{ color: '#38bdf8', fontSize: '11px', background: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {data.lastAction}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
