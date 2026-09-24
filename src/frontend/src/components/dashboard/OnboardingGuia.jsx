// src/frontend/src/components/dashboard/OnboardingGuia.jsx
import React, { useState } from 'react';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { useOnboardingEstado } from '../../hooks/useOnboardingEstado';
import { useNotifications } from '../common/Notifications';

/**
 * Qué hacer para que el panel deje de estar vacío.
 *
 * Aparece sólo mientras queda algo por conectar y desaparece sola cuando todo
 * está en marcha: es una guía de puesta en marcha, no un panel permanente.
 *
 * Enseña un único paso a la vez. La lista completa está debajo para quien quiera
 * verla, pero atenuada: cuatro pendientes con el mismo peso visual paralizan más
 * que una sola instrucción.
 */
export function OnboardingGuia({ language = 'es', onNavigate }) {
  const es = language === 'es';
  const { estado, cargando, error, aplicarPack } = useOnboardingEstado();
  const { notify } = useNotifications();
  const [aplicando, setAplicando] = useState(false);

  // Mientras carga no se enseña nada: un parpadeo de "te falta todo" en cada
  // recarga sería peor que esperar medio segundo.
  if (cargando || error || !estado) return null;

  // Todo conectado y configurado: la guía ya no pinta nada aquí.
  if (estado.completado === 100 && estado.packAplicado) return null;

  const siguiente = estado.siguiente;

  const handleAplicar = async () => {
    setAplicando(true);
    try {
      const r = await aplicarPack();
      notify(
        es
          ? `Configuración de coach aplicada: ${r.agentes} agentes programados y tu criterio de leads listo.`
          : `Coach setup applied: ${r.agentes} agents scheduled and your lead criteria ready.`,
        { type: 'success' }
      );
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setAplicando(false);
    }
  };

  return (
    <div
      className="ogd-panel"
      style={{ borderLeft: '3px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {es ? 'Termina de poner en marcha tu panel' : 'Finish setting up your dashboard'}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {estado.completado}% {es ? 'conectado' : 'connected'}
        </span>
      </div>

      <div
        style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-muted)', overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={estado.completado}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={es ? 'Progreso de puesta en marcha' : 'Setup progress'}
      >
        <div style={{ width: `${estado.completado}%`, height: '100%', background: 'var(--accent)', transition: 'width 300ms ease' }} />
      </div>

      {/* El único paso que toca ahora */}
      {siguiente && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {siguiente.titulo}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {siguiente.porque}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('settings', { tab: 'vault' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', fontSize: '13px', fontWeight: 600,
              borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--accent)', color: 'var(--accent-text)', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {es ? 'Conectar' : 'Connect'}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Configuración del sector: un clic y deja de haber nada que decidir */}
      {!estado.packAplicado && (
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap', paddingTop: '14px', borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '240px', flex: 1 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {es ? 'Carga la configuración para coaches' : 'Load the coaching setup'}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {es
                ? 'Deja listos tu criterio para calificar leads y los horarios de los agentes. Puedes cambiarlo todo después.'
                : 'Sets up your lead scoring criteria and agent schedules. You can change any of it later.'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAplicar}
            disabled={aplicando}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '9px 16px', fontSize: '13px', fontWeight: 600,
              borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              cursor: aplicando ? 'wait' : 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {aplicando && <Loader2 size={14} aria-hidden="true" />}
            {aplicando ? (es ? 'Aplicando…' : 'Applying…') : (es ? 'Aplicar' : 'Apply')}
          </button>
        </div>
      )}

      {/* La lista completa, atenuada: contexto para quien lo quiera */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', paddingTop: '4px' }}>
        {(estado.pasos || []).map(p => (
          <span
            key={p.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px',
              color: p.hecho ? 'var(--success)' : 'var(--text-muted)',
              opacity: p.hecho ? 1 : 0.75,
            }}
          >
            {p.hecho
              ? <Check size={13} aria-hidden="true" />
              : <span aria-hidden="true" style={{
                  width: '11px', height: '11px', borderRadius: '50%',
                  border: '1px solid var(--border)', display: 'inline-block',
                }} />}
            {p.titulo}
          </span>
        ))}
      </div>
    </div>
  );
}

export default OnboardingGuia;
