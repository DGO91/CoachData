// src/frontend/src/components/dashboard/ConnectedActivityPanel.jsx
import React from 'react';
import { CreditCard, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { useCanonicalActivity } from '../../hooks/useCanonicalActivity';
import EmptyState from '../common/EmptyState';

const PROVIDER_LABEL = {
  stripe: 'Stripe',
  tally: 'Tally',
  calendly: 'Calendly',
  kajabi: 'Kajabi',
  google: 'Google',
};

function relativeTime(iso, isEs) {
  if (!iso) return '';
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return isEs ? 'ahora' : 'now';
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} h`;
  return new Date(iso).toLocaleDateString(isEs ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short' });
}

/**
 * La primera pantalla donde la metáfora del pulpo se ve de verdad: pagos y
 * formularios llegando de herramientas distintas, mostrados igual porque ya
 * vienen traducidos al modelo canónico.
 *
 * Si mañana el coach cambia Tally por Typeform, este panel no se entera —
 * que es exactamente la prueba de que la capa canónica está bien puesta.
 */
export function ConnectedActivityPanel({ organizationId, language = 'es' }) {
  const isEs = language === 'es';
  const { loading, error, events, reload } = useCanonicalActivity(organizationId);

  return (
    <div className="ogd-panel">
      <div className="ogd-panel-header">
        <span>{isEs ? 'Actividad de tus herramientas conectadas' : 'Activity from your connected tools'}</span>
        {!loading && !error && events.length > 0 && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isEs ? 'en tiempo real' : 'live'}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {isEs ? 'Cargando…' : 'Loading…'}
        </div>
      )}

      {!loading && error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {isEs ? 'No se pudo cargar la actividad' : 'Could not load activity'}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{error}</div>
          <button
            type="button"
            onClick={reload}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.4rem 0.9rem', borderRadius: '8px',
              border: '1px solid var(--border)', background: 'var(--accent)',
              color: 'var(--accent-text)', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            {isEs ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <EmptyState
          icon="file"
          title={isEs ? 'Todavía no ha llegado nada' : 'Nothing has arrived yet'}
          description={
            isEs
              ? 'Cuando tus herramientas conectadas registren un pago o una respuesta de formulario, aparecerá aquí automáticamente. No mostramos ejemplos.'
              : 'When your connected tools record a payment or a form response, it will show up here automatically. We do not show samples.'
          }
        />
      )}

      {!loading && !error && events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '0.75rem', padding: '10px 14px',
                background: 'var(--bg-muted)', borderRadius: '10px',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {ev.type === 'payment'
                  ? <CreditCard size={16} style={{ color: 'var(--good, var(--success))', flexShrink: 0 }} aria-hidden="true" />
                  : <FileText size={16} style={{ color: 'var(--accent-ink, var(--accent))', flexShrink: 0 }} aria-hidden="true" />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {PROVIDER_LABEL[ev.provider] || ev.provider}
                    {ev.detail ? ` · ${ev.detail}` : ''}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                {relativeTime(ev.occurredAt, isEs)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConnectedActivityPanel;
