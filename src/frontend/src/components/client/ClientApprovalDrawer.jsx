// src/frontend/src/components/client/ClientApprovalDrawer.jsx
import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { TRANSLATIONS } from '../../i18n/translations';

export function ClientApprovalDrawer({ isOpen, onClose, deliverable, onApprove, onRequestRevision, language = 'es' }) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const t = TRANSLATIONS[language] || TRANSLATIONS.es;

  if (!isOpen || !deliverable) return null;

  const handleApprove = async () => {
    setSubmitting(true);
    await onApprove(deliverable.id);
    setSubmitting(false);
    onClose();
  };

  const handleRevision = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    await onRequestRevision(deliverable.id, feedback);
    setFeedback('');
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {deliverable.title}
            </h3>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
            {deliverable.description}
          </p>

          {deliverable.deliverable_url && (
            <div style={{ marginBottom: '24px' }}>
              <a
                href={deliverable.deliverable_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-ink, var(--accent))',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                🔗 Abrir Vista Previa del Entregable
              </a>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Observaciones o Ajustes Requeridos
            </label>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t.feedback_placeholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <button
            disabled={submitting}
            onClick={handleApprove}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'var(--good, #22c55e)',
              // --good/--warn son tonos claros en todas las paletas: texto oscuro, no blanco.
              color: '#10231A',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={16} />
            <span>{t.approve_deliverable}</span>
          </button>

          <button
            disabled={submitting || !feedback.trim()}
            onClick={handleRevision}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'var(--warn, #f59e0b)',
              color: '#10231A',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: submitting || !feedback.trim() ? 'not-allowed' : 'pointer',
              opacity: !feedback.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={16} />
            <span>{t.request_revision}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
