// src/frontend/src/components/dashboard/OperationalHealthCard.jsx
import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { useOperationalHealth } from '../../hooks/useOperationalHealth';
import { HealthTrendMiniChart } from './HealthTrendMiniChart';
import { TRANSLATIONS } from '../../i18n/translations';

export function OperationalHealthCard({ organizationId, language = 'es' }) {
  const { score, status, trend, breakdown, insights, loading } = useOperationalHealth(organizationId);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  let statusClass = 'ogd-status-healthy';
  let statusText = t.healthy;
  let StatusIcon = ShieldCheck;

  if (status === 'critical') {
    statusClass = 'ogd-status-critical';
    statusText = t.critical;
    StatusIcon = AlertCircle;
  } else if (status === 'attention') {
    statusClass = 'ogd-status-attention';
    statusText = t.attention;
    StatusIcon = AlertTriangle;
  }

  return (
    <div className="ogd-health-card">
      {/* SECCIÓN IZQUIERDA: RING SCORE Y STATUS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className={`ogd-health-score-ring ${statusClass}`}>
          {score}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StatusIcon size={18} />
              <strong style={{ fontSize: '16px' }}>{t.health_score}: {statusText}</strong>
            </div>
            <HealthTrendMiniChart trend={trend} />
          </div>

          {/* INSIGHTS DESTELLADOS (MÁXIMO 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
            {insights.map((ins, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: DESGLOSE PONDERADO (OHS BREAKDOWN) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '220px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid var(--border, rgba(255,255,255,0.05))',
          fontSize: '11px',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary, #f1f5f9)', marginBottom: '2px' }}>{t.ohs_breakdown}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
          <span>{t.execution_completion}:</span>
          <strong style={{ color: '#38bdf8' }}>{breakdown.completion} / 25 pts</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
          <span>{t.overdue_safety}:</span>
          <strong style={{ color: '#22c55e' }}>{breakdown.overdueSafety} / 25 pts</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
          <span>{t.team_activity_metric}:</span>
          <strong style={{ color: '#f59e0b' }}>{breakdown.teamActivity} / 20 pts</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
          <span>{t.system_usage}:</span>
          <strong style={{ color: '#10b981' }}>{breakdown.systemUsage} / 15 pts</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted, #94a3b8)' }}>
          <span>{t.ai_intelligence}:</span>
          <strong style={{ color: '#8b5cf6' }}>{breakdown.aiPredictivity} / 15 pts</strong>
        </div>
      </div>
    </div>
  );
}
