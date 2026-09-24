// src/frontend/src/components/dashboard/OperationalAnomaliesPanel.jsx
import React from 'react';
import { AlertCircle, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { useOperationalAnomalies } from '../../hooks/useOperationalAnomalies';
import { TRANSLATIONS } from '../../i18n/translations';

export function OperationalAnomaliesPanel({ organizationId, language = 'es' }) {
  const { critical, warnings, healthySignals, anomalyScore, loading } = useOperationalAnomalies(organizationId, language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  return (
    <div className="ogd-panel ogd-executive-anomalies-panel">
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.operational_anomalies}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {t.anomaly_score}: <strong style={{ color: anomalyScore >= 80 ? 'var(--good, #22c55e)' : 'var(--warn, #f59e0b)' }}>{anomalyScore}/100</strong>
          </span>
          <span style={{ color: 'var(--crit, #ef4444)', fontWeight: 600 }}>{t.criticalRisks}: {critical.length}</span>
          <span style={{ color: 'var(--warn, #f59e0b)', fontWeight: 600 }}>{t.attentionRequired}: {warnings.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Critical Anomalies List */}
        {critical.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--crit, #ef4444)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <AlertCircle size={16} style={{ color: 'var(--crit, #ef4444)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.description}</div>
            </div>
          </div>
        ))}

        {/* Warning Anomalies List */}
        {warnings.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--warn, #f59e0b)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <AlertTriangle size={16} style={{ color: 'var(--warn, #f59e0b)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.description}</div>
            </div>
          </div>
        ))}

        {/* Healthy Signals */}
        {healthySignals.map((sig, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--good, #22c55e)',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--good, #22c55e)', flexShrink: 0 }} />
            <span>{sig}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
