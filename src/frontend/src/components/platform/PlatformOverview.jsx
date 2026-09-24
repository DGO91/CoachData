// src/frontend/src/components/platform/PlatformOverview.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiJson } from '../../core/api/authFetch';

/**
 * Puente de mando de la agencia: una fila por cliente, ordenada por lo que más
 * urge mirar.
 *
 * Es la única pantalla que enseña varias organizaciones a la vez, y no es para
 * el coach: es el instrumento de trabajo de quien opera el servicio. Sin ella,
 * cada cliente nuevo suma soporte reactivo — te enteras de que una integración
 * se cayó cuando el cliente escribe.
 */
export function PlatformOverview({ language = 'es' }) {
  const es = language === 'es';
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setDatos(await apiJson('/api/platform/overview'));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const haceCuanto = (iso) => {
    if (!iso) return es ? 'nunca' : 'never';
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return es ? 'hace menos de 1 h' : 'under 1 h ago';
    if (h < 48) return es ? `hace ${h} h` : `${h} h ago`;
    return es ? `hace ${Math.floor(h / 24)} días` : `${Math.floor(h / 24)} days ago`;
  };

  const celda = { padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '13px' };
  const cabecera = {
    ...celda,
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {es ? 'Estado de los clientes' : 'Client status'}
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {datos
              ? (es
                  ? `${datos.organizaciones} clientes · ${datos.conProblemas} necesitan atención`
                  : `${datos.organizaciones} clients · ${datos.conProblemas} need attention`)
              : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          aria-label={es ? 'Actualizar' : 'Refresh'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid var(--border)',
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            cursor: cargando ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {es ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-surface)' }}>
          {es ? 'No se pudo cargar el estado de los clientes: ' : 'Could not load client status: '}{error}
        </div>
      )}

      {cargando && !datos && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{es ? 'Cargando…' : 'Loading…'}</div>
      )}

      {datos && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr>
                <th style={{ ...cabecera, textAlign: 'left' }}>{es ? 'Cliente' : 'Client'}</th>
                <th style={{ ...cabecera, textAlign: 'left' }}>{es ? 'Estado' : 'Status'}</th>
                <th style={{ ...cabecera, textAlign: 'right' }}>{es ? 'Conectores' : 'Connectors'}</th>
                <th style={{ ...cabecera, textAlign: 'right' }}>{es ? 'Por reconectar' : 'To reconnect'}</th>
                <th style={{ ...cabecera, textAlign: 'right' }}>{es ? 'Sin datos' : 'Silent'}</th>
                <th style={{ ...cabecera, textAlign: 'left' }}>{es ? 'Último dato' : 'Last data'}</th>
                <th style={{ ...cabecera, textAlign: 'right' }}>{es ? 'Agentes 24 h' : 'Agents 24 h'}</th>
              </tr>
            </thead>
            <tbody>
              {datos.clientes.map(c => {
                const grave = c.integraciones.credencialesRotas > 0;
                const aviso = !grave && c.problemas > 0;
                const tono = grave ? 'var(--danger)' : aviso ? 'var(--warning)' : 'var(--success)';
                return (
                  <tr key={c.organizationId}>
                    <td style={{ ...celda, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.nombre}
                      <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {c.miembros} {es ? (c.miembros === 1 ? 'miembro' : 'miembros') : (c.miembros === 1 ? 'member' : 'members')}
                      </div>
                    </td>
                    <td style={celda}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        color: tono,
                        border: `1px solid ${tono}`,
                      }}>
                        {grave ? (es ? 'Necesita acción' : 'Needs action')
                               : aviso ? (es ? 'Revisar' : 'Review')
                                       : (es ? 'Correcto' : 'OK')}
                      </span>
                    </td>
                    <td style={{ ...celda, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.integraciones.conectores}</td>
                    <td style={{ ...celda, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: c.integraciones.credencialesRotas ? 'var(--danger)' : 'inherit' }}>
                      {c.integraciones.credencialesRotas}
                    </td>
                    <td style={{ ...celda, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: c.integraciones.enSilencio ? 'var(--warning)' : 'inherit' }}>
                      {c.integraciones.enSilencio}
                    </td>
                    <td style={{ ...celda, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {haceCuanto(c.integraciones.ultimoEvento)}
                    </td>
                    <td style={{ ...celda, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {c.agentes24h.ejecuciones}
                      {c.agentes24h.fallos > 0 && (
                        <span style={{ color: 'var(--danger)' }}> ({c.agentes24h.fallos})</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlatformOverview;
