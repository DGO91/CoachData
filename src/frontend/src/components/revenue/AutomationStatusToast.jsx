// src/frontend/src/components/revenue/AutomationStatusToast.jsx
// CoachData Operational OS v2 — Canonical Automation Status Feedback Component
// Compatible with I18N ES/EN and all 8 dynamic themes via CSS variables.

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader, AlertTriangle, ExternalLink, RotateCcw } from 'lucide-react';

const STATUS_CONFIG = {
  idle: null,
  processing: {
    es: { title: 'Procesando…', sub: 'La automatización está en ejecución. Por favor espera.' },
    en: { title: 'Processing…', sub: 'Automation is running. Please wait.' },
    color: 'var(--accent-ink, var(--accent))',
    bg: 'rgba(184, 152, 90, 0.08)',
    border: 'rgba(184, 152, 90, 0.25)',
    Icon: Loader,
    spin: true
  },
  completed: {
    es: { title: 'Completado', sub: 'La operación fue procesada con éxito.' },
    en: { title: 'Completed', sub: 'Operation processed successfully.' },
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.25)',
    Icon: CheckCircle,
    spin: false
  },
  failed: {
    es: { title: 'Error en Automatización', sub: 'La operación no pudo completarse. Intenta de nuevo.' },
    en: { title: 'Automation Failed', sub: 'The operation could not complete. Please try again.' },
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    Icon: XCircle,
    spin: false
  },
  needs_reconnection: {
    es: { title: 'Requiere Reconexión', sub: 'Una integración necesita ser reconfigurada en el Security Vault.' },
    en: { title: 'Needs Reconnection', sub: 'An integration needs to be reconfigured in the Security Vault.' },
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.25)',
    Icon: AlertTriangle,
    spin: false
  }
};

/**
 * AutomationStatusToast
 * 
 * Props:
 *   status       - 'idle' | 'processing' | 'completed' | 'failed' | 'needs_reconnection'
 *   error        - string | null
 *   result       - object | null (from API response)
 *   language     - 'es' | 'en'
 *   onRetry      - function | null
 *   onDismiss    - function | null
 *   onNavigateVault - function | null (for needs_reconnection state)
 *   extraInfo    - string | null (custom message appended below status)
 *   autoDismissMs - number | null (auto-dismiss after N ms when completed)
 */
export default function AutomationStatusToast({
  status = 'idle',
  error = null,
  result = null,
  language = 'es',
  onRetry = null,
  onDismiss = null,
  onNavigateVault = null,
  extraInfo = null,
  autoDismissMs = null
}) {
  const [visible, setVisible] = useState(true);
  const isEs = language === 'es';

  // Auto-dismiss on completed
  useEffect(() => {
    if (status === 'completed' && autoDismissMs) {
      const t = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(t);
    }
  }, [status, autoDismissMs, onDismiss]);

  // Reset visibility when status changes
  useEffect(() => {
    setVisible(true);
  }, [status]);

  if (status === 'idle' || !visible) return null;

  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const copy = config[isEs ? 'es' : 'en'];
  const { Icon } = config;

  // Build extra context from API result
  const getResultDetails = () => {
    if (!result) return null;
    const lines = [];
    if (result.task_id) lines.push(`${isEs ? 'Tarea' : 'Task'}: ${result.task_id}`);
    if (result.deal_id) lines.push(`Deal ID: ${result.deal_id}`);
    if (result.workspace_id) lines.push(`${isEs ? 'Portal' : 'Portal'}: ${result.workspace_id}`);
    if (result.leads_inserted > 0) lines.push(`${result.leads_inserted} ${isEs ? 'leads importados' : 'leads imported'}`);
    if (!result.webhook_fired && result.message?.includes('Security Vault')) {
      lines.push(isEs
        ? '⚡ Configura Make.com en el Security Vault para activar sincronización automática.'
        : '⚡ Configure Make.com in the Security Vault to enable automatic sync.');
    }
    return lines.length > 0 ? lines.join(' · ') : null;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '14px',
        marginTop: '1rem',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
    >
      {/* Status Icon */}
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        <Icon
          size={18}
          style={{
            color: config.color,
            animation: config.spin ? 'spin 1s linear infinite' : 'none'
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: config.color, fontSize: '13px' }}>
          {copy.title}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px', lineHeight: '1.4' }}>
          {error || copy.sub}
        </div>

        {/* Result details */}
        {(() => {
          const details = getResultDetails();
          return details ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
              {details}
            </div>
          ) : null;
        })()}

        {/* Extra info */}
        {extraInfo && (
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px', fontStyle: 'italic' }}>
            {extraInfo}
          </div>
        )}

        {/* Action buttons */}
        {(onRetry || onNavigateVault || onDismiss) && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '10px', flexWrap: 'wrap' }}>
            {status === 'needs_reconnection' && onNavigateVault && (
              <button
                onClick={onNavigateVault}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  fontWeight: 700, cursor: 'pointer',
                  background: config.bg, color: config.color,
                  border: `1px solid ${config.border}`
                }}
              >
                <ExternalLink size={11} />
                {isEs ? 'Ir al Security Vault' : 'Go to Security Vault'}
              </button>
            )}
            {status === 'failed' && onRetry && (
              <button
                onClick={onRetry}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  fontWeight: 700, cursor: 'pointer',
                  background: config.bg, color: config.color,
                  border: `1px solid ${config.border}`
                }}
              >
                <RotateCcw size={11} />
                {isEs ? 'Reintentar' : 'Retry'}
              </button>
            )}
            {onDismiss && status !== 'processing' && (
              <button
                onClick={() => { setVisible(false); onDismiss(); }}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  fontWeight: 600, cursor: 'pointer',
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1px solid var(--border)'
                }}
              >
                {isEs ? 'Cerrar' : 'Dismiss'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
