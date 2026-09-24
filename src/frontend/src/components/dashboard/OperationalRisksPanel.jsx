// src/frontend/src/components/dashboard/OperationalRisksPanel.jsx
import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useOperationalRisks } from '../../hooks/useOperationalRisks';
import { TRANSLATIONS } from '../../i18n/translations';

export function OperationalRisksPanel({ organizationId, language = 'es' }) {
  const { criticalRisks = [], attentionRequired = [], healthySignals = [], loading } = useOperationalRisks(organizationId, language);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  const safeCritical = Array.isArray(criticalRisks) ? criticalRisks : [];
  const safeWarning = Array.isArray(attentionRequired) ? attentionRequired : [];
  const safeHealthy = Array.isArray(healthySignals) ? healthySignals : [];

  if (loading) {
    return <div className="ogd-panel-skeleton" />;
  }

  return (
    <div className="ogd-panel" style={{ marginTop: '8px' }}>
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertOctagon size={18} style={{ color: safeCritical.length > 0 ? '#ef4444' : '#22c55e' }} />
          <span>{t.risks_panel}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
          {safeCritical.length} {t.critical_count || (language === 'es' ? 'crítico(s)' : 'critical')} | {safeWarning.length} {t.warning_count || (language === 'es' ? 'advertencia(s)' : 'warning(s)')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {/* 1. RIESGOS CRÍTICOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertOctagon size={14} />
            <span>{t.critical_risks}</span>
          </div>

          {safeCritical.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted, #64748b)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontStyle: 'italic' }}>
              🟢 {t.zero_critical_risks}
            </div>
          ) : (
            safeCritical.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>{r.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>{r.desc}</div>
              </div>
            ))
          )}
        </div>

        {/* 2. ADVERTENCIAS / ATENCIÓN REQUERIDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} />
            <span>{t.attention_required}</span>
          </div>

          {safeWarning.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted, #64748b)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontStyle: 'italic' }}>
              {t.no_warnings || (language === 'es' ? 'Sin advertencias secundarias' : 'No secondary warnings')}
            </div>
          ) : (
            safeWarning.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>{r.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>{r.desc}</div>
              </div>
            ))
          )}
        </div>

        {/* 3. SEÑALES SALUDABLES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            <span>{t.healthy_signals}</span>
          </div>

          {safeHealthy.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted, #64748b)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontStyle: 'italic' }}>
              {t.no_healthy_signals || (language === 'es' ? 'Sin señales registradas' : 'No signals recorded')}
            </div>
          ) : (
            safeHealthy.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{s.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>{s.desc}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
