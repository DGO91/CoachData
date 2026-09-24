// src/frontend/src/components/dashboard/UpcomingSessionsPanel.jsx
import React from 'react';
import { CalendarClock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useUpcomingSessions } from '../../hooks/useUpcomingSessions';
import EmptyState from '../common/EmptyState';

// Nombre legible del tentáculo del que viene cada sesión. Si llega uno que no
// está aquí se muestra su id tal cual — un proveedor nuevo nunca debe romper
// el panel ni quedar invisible.
const PROVIDER_LABEL = {
  calendly: 'Calendly',
  google_calendar: 'Google Calendar',
  stripe: 'Stripe',
  tally: 'Tally',
};

function formatWhen(startsAt, isEs) {
  if (!startsAt) return '';
  const d = new Date(startsAt);
  const locale = isEs ? 'es-ES' : 'en-US';
  const hoy = new Date();
  const manana = new Date(Date.now() + 86400000);
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();

  const hora = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (mismoDia(d, hoy)) return `${isEs ? 'Hoy' : 'Today'} · ${hora}`;
  if (mismoDia(d, manana)) return `${isEs ? 'Mañana' : 'Tomorrow'} · ${hora}`;
  return `${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hora}`;
}

function isEnCurso(startsAt, endsAt) {
  const ahora = Date.now();
  const inicio = new Date(startsAt).getTime();
  const fin = endsAt ? new Date(endsAt).getTime() : inicio + 3600000;
  return ahora >= inicio && ahora <= fin;
}

/**
 * Las sesiones que el coach tiene por delante, vengan de la herramienta que
 * vengan. Es la otra mitad de la Fase 3: ConnectedActivityPanel mira hacia
 * atrás (qué ha entrado), este mira hacia delante (qué toca).
 */
export function UpcomingSessionsPanel({ organizationId, language = 'es' }) {
  const isEs = language === 'es';
  const { loading, error, sessions, reload } = useUpcomingSessions(organizationId);

  return (
    <div className="ogd-panel">
      <div className="ogd-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarClock size={18} style={{ color: 'var(--accent-ink, var(--accent))' }} aria-hidden="true" />
          <span>{isEs ? 'Tus próximas sesiones' : 'Your upcoming sessions'}</span>
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {isEs ? 'Cargando…' : 'Loading…'}
        </div>
      )}

      {!loading && error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} aria-hidden="true" />
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {isEs ? 'No se pudieron cargar las sesiones' : 'Could not load sessions'}
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
            <RefreshCw size={13} aria-hidden="true" />
            {isEs ? 'Reintentar' : 'Retry'}
          </button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <EmptyState
          icon="check"
          title={isEs ? 'No tienes sesiones programadas' : 'No sessions scheduled'}
          description={
            isEs
              ? 'Cuando conectes tu calendario o tu herramienta de reservas, tus próximas sesiones aparecerán aquí automáticamente.'
              : 'Once you connect your calendar or booking tool, your upcoming sessions will show up here automatically.'
          }
        />
      )}

      {!loading && !error && sessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map((s) => {
            const enCurso = isEnCurso(s.startsAt, s.endsAt);
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.75rem', padding: '10px 14px',
                  background: 'var(--bg-muted)', borderRadius: '10px',
                  border: enCurso ? '1px solid var(--accent)' : '1px solid var(--border)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.who}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {PROVIDER_LABEL[s.provider] || s.provider}
                    {s.type ? ` · ${s.type}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: enCurso ? 'var(--accent-ink, var(--accent))' : 'var(--text-primary)' }}>
                    {formatWhen(s.startsAt, isEs)}
                  </div>
                  {enCurso && (
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-ink, var(--accent))', textTransform: 'uppercase' }}>
                      {isEs ? 'En curso' : 'In progress'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UpcomingSessionsPanel;
