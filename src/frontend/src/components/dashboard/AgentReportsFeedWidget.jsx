// src/frontend/src/components/dashboard/AgentReportsFeedWidget.jsx
import React, { useState, useEffect } from 'react';
import { Bot, FileText, ArrowRight, Clock, CheckCircle2, X } from 'lucide-react';
import { authFetch } from '../../core/api/authFetch';
import { useNotifications } from '../common/Notifications';

export function AgentReportsFeedWidget({ language = 'es', onNavigate, onOpenReport }) {
  const { notify } = useNotifications();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const isEs = language === 'es';

  const fetchReports = async () => {
    try {
      const res = await authFetch('/api/agents/reports?limit=5&unread_only=true');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.warn('Error fetching agent reports feed', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    window.addEventListener('agent_report_read', fetchReports);
    return () => window.removeEventListener('agent_report_read', fetchReports);
  }, []);

  const getAgentBadge = (type) => {
    switch (type) {
      case 'morning_briefing':
        return { label: isEs ? 'Matutino' : 'Morning', color: 'var(--accent-ink, var(--accent))' };
      case 'pre_call':
        return { label: isEs ? 'Pre-Call' : 'Pre-Call', color: '#60a5fa' };
      case 'evening_summary':
        return { label: isEs ? 'Cierre' : 'Close', color: '#f59e0b' };
      case 'weekly_digest':
        return { label: isEs ? 'Semanal' : 'Weekly', color: 'var(--good, #22c55e)' };
      default:
        return { label: isEs ? 'Agente' : 'Agent', color: 'var(--text-muted)' };
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md, 12px)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={16} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEs ? 'Buzón de Reportes de IA' : 'AI Reports Inbox'}
          </h3>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('reports-hub')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-ink, var(--accent))',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: 0,
          }}
        >
          <span>{isEs ? 'Ver Buzón' : 'View Inbox'}</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'var(--bg-root)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
          {isEs ? 'No hay reportes depositados aún. Los informes generados por los agentes aparecerán aquí.' : 'No deposited reports yet. Generated reports will appear here.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map((rep) => {
            const badge = getAgentBadge(rep.agent_type);
            return (
              <div
                key={rep.id}
                onClick={() => onOpenReport && onOpenReport(rep)}
                style={{
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: badge.color,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {badge.label}
                    </span>
                    {!rep.is_read && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--accent)',
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await authFetch(`/api/agents/reports/${rep.id}/read`, { method: 'PATCH' });
                          notify(isEs ? 'Reporte descartado' : 'Report dismissed', { type: 'success' });
                          window.dispatchEvent(new Event('agent_report_read'));
                        } catch (err) {
                          notify(isEs ? 'Error al descartar' : 'Error dismissing', { type: 'error' });
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={isEs ? 'Ocultar reporte' : 'Hide report'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {rep.title}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rep.summary}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
