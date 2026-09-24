// src/frontend/src/components/client/ClientDeliverablesPanel.jsx
import React from 'react';
import { CheckCircle, Clock, AlertTriangle, FileCheck } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function ClientDeliverablesPanel({ deliverables = [], onSelectDeliverable, language = 'es' }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;
  const safeDeliverables = Array.isArray(deliverables) ? deliverables : [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--good, #22c55e)', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> {t.approved}
          </span>
        );
      case 'revision_requested':
        return (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--warn, #f59e0b)', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> {t.revision_requested}
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-ink, var(--accent))', background: 'rgba(184, 152, 90, 0.12)', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} /> {t.pending_approval}
          </span>
        );
    }
  };

  return (
    <div className="ogd-panel" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
      <div className="ogd-panel-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} />
          <span>{t.deliverables}</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{safeDeliverables.length} total</span>
      </div>

      {safeDeliverables.length === 0 ? (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
          {t.no_deliverables}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {safeDeliverables.map((item) => (
            <div
              key={item?.id}
              onClick={() => onSelectDeliverable && onSelectDeliverable(item)}
              style={{
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item?.title || 'Entregable'}</span>
                {getStatusBadge(item?.status)}
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item?.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
