// src/frontend/src/components/dashboard/AgentTelemetryPanel.jsx
import React, { useState, useEffect } from 'react';
import { apiJson } from '../../core/api/authFetch';

/**
 * Qué han hecho los agentes en las últimas 24 horas.
 *
 * La tabla ai_agent_logs existía desde el principio y nunca se escribió una
 * fila: ExecutionPipeline envolvía el insert en un `if (supabaseClient)` y el
 * cliente llegaba undefined, así que el registro se saltaba en silencio. No
 * había forma de saber si el brief matutino se había ejecutado.
 *
 * Este panel responde a "qué requiere mi atención": lo que importa de un agente
 * no es que exista, es si corrió y si falló.
 */
export function AgentTelemetryPanel({ language = 'es' }) {
  const es = language === 'es';
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const r = await apiJson('/api/agents/telemetry');
        if (!cancelado) { setDatos(r); setError(null); }
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const nombreLegible = (clave) => String(clave || '')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());

  const haceCuanto = (iso) => {
    if (!iso) return '';
    const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (min < 1) return es ? 'hace un momento' : 'just now';
    if (min < 60) return es ? `hace ${min} min` : `${min} min ago`;
    const h = Math.floor(min / 60);
    return es ? `hace ${h} h` : `${h} h ago`;
  };

  return (
    <div className="ogd-panel" style={{ height: 'fit-content' }}>
      <div className="ogd-panel-header">
        <span>{es ? 'Tus agentes hoy' : 'Your agents today'}</span>
        {datos?.totalFallos > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--danger)' }}>
            {datos.totalFallos} {es ? 'con error' : 'failed'}
          </span>
        )}
      </div>

      {cargando && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {es ? 'Cargando…' : 'Loading…'}
        </div>
      )}

      {!cargando && error && (
        <div style={{ fontSize: '13px', color: 'var(--danger)' }}>
          {es ? 'No se pudo leer la actividad de los agentes.' : 'Could not read agent activity.'}
        </div>
      )}

      {/* Estado vacío que dice qué hacer, no sólo que no hay nada. El primer día
          este panel está vacío y ése es el momento de mayor abandono. */}
      {!cargando && !error && (!datos?.agentes?.length) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            {es ? 'Todavía no ha corrido ningún agente.' : 'No agent has run yet.'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {es
              ? 'Conecta tu calendario y tu pasarela de cobros para que empiecen a trabajar por la mañana.'
              : 'Connect your calendar and payment gateway so they start working in the morning.'}
          </span>
        </div>
      )}

      {!cargando && !error && datos?.agentes?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {datos.agentes.map(a => (
            <div
              key={a.agente}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '12px',
                padding: '8px 10px',
                background: 'var(--bg-root)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {nombreLegible(a.agente)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {a.ejecuciones} {es ? (a.ejecuciones === 1 ? 'vez' : 'veces') : (a.ejecuciones === 1 ? 'run' : 'runs')}
                  {' · '}{haceCuanto(a.ultimaEjecucion)}
                </span>
              </div>
              <span
                style={{
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                  color: a.fallos > 0 ? 'var(--danger)' : 'var(--success)',
                }}
              >
                {a.fallos > 0
                  ? (es ? `${a.fallos} con error` : `${a.fallos} failed`)
                  : (es ? 'Correcto' : 'OK')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentTelemetryPanel;
