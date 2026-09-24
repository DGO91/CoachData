// src/frontend/src/components/settings/ActiveSurfacesPanel.jsx
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useOrganizationSurfaces } from '../../hooks/useOrganizationSurfaces';
import { useNotifications } from '../common/Notifications';

/**
 * Qué zonas del producto ve esta organización.
 *
 * El producto llegó a nueve zonas navegables mientras su promesa es un único
 * centro de mando. Apagar una zona la retira del menú sin borrar nada: los datos
 * siguen ahí y volver a encenderla los devuelve intactos. Sirve para averiguar
 * qué se usa de verdad antes de decidir qué se elimina.
 */

const NUCLEO = [
  {
    clave: 'dashboard',
    titulo: { es: 'Centro de Mando', en: 'Command Center' },
    detalle: {
      es: 'Finanzas, agenda y alertas del día en una sola pantalla.',
      en: 'Finances, schedule and alerts of the day on a single screen.',
    },
  },
  {
    clave: 'agents-hub',
    titulo: { es: 'Centro de Agentes', en: 'Agents Hub' },
    detalle: {
      es: 'Los agentes que preparan tus sesiones y resúmenes.',
      en: 'The agents that prepare your sessions and summaries.',
    },
  },
  {
    clave: 'reports-hub',
    titulo: { es: 'Reportes', en: 'Reports' },
    detalle: {
      es: 'Historial de todo lo que han generado tus agentes.',
      en: 'History of everything your agents have generated.',
    },
  },
];

const OPCIONALES = [
  {
    clave: 'media-suite',
    titulo: { es: 'Media Suite', en: 'Media Suite' },
    detalle: {
      es: 'Escritorio de contenido, escritorio de proyectos y banco de mensajes.',
      en: 'Content desk, project desk and message bank.',
    },
    aviso: {
      es: 'El escritorio de contenido guarda su tablero en este navegador, no en el servidor.',
      en: 'The content desk stores its board in this browser, not on the server.',
    },
  },
  {
    clave: 'revenue-suite',
    titulo: { es: 'Revenue Suite', en: 'Revenue Suite' },
    detalle: {
      es: 'CRM propio, propuestas, contratos y facturación.',
      en: 'Built-in CRM, proposals, contracts and billing.',
    },
  },
  {
    clave: 'client-portal',
    titulo: { es: 'Portal de Clientes', en: 'Client Portal' },
    detalle: {
      es: 'Lo que ven tus clientes: entregables, comentarios y aprobaciones.',
      en: 'What your clients see: deliverables, comments and approvals.',
    },
    aviso: {
      es: 'Al apagarlo, tus clientes dejan de poder entrar a su portal.',
      en: 'Turning this off stops your clients from accessing their portal.',
    },
  },
];

export function ActiveSurfacesPanel({ language = 'es', isAdmin = true }) {
  const es = language === 'es';
  const { surfaces, loading, error, guardar } = useOrganizationSurfaces();
  const { notify, confirm } = useNotifications();
  const [guardando, setGuardando] = useState(null);

  const alternar = async (zona) => {
    const encendida = surfaces[zona.clave] !== false;

    if (encendida && zona.aviso) {
      const seguir = await confirm({
        message: es
          ? `Vas a ocultar ${zona.titulo.es}. ${zona.aviso.es} Puedes volver a encenderla cuando quieras.`
          : `You are about to hide ${zona.titulo.en}. ${zona.aviso.en} You can turn it back on at any time.`,
      });
      if (!seguir) return;
    }

    setGuardando(zona.clave);
    try {
      await guardar({ [zona.clave]: !encendida });
      notify(
        es
          ? `${zona.titulo.es} ${!encendida ? 'está visible en el menú' : 'ya no aparece en el menú'}`
          : `${zona.titulo.en} ${!encendida ? 'is now visible in the menu' : 'no longer appears in the menu'}`,
        { type: 'success' }
      );
    } catch (err) {
      notify(err.message, { type: 'error' });
    } finally {
      setGuardando(null);
    }
  };

  const Fila = ({ zona, fija }) => {
    const encendida = fija || surfaces[zona.clave] !== false;
    const ocupada = guardando === zona.clave;
    return (
      <div
        className="flex items-start justify-between gap-4 p-4 rounded-lg"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {es ? zona.titulo.es : zona.titulo.en}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {es ? zona.detalle.es : zona.detalle.en}
          </span>
        </div>

        {fija ? (
          <span
            className="flex items-center gap-1 text-xs whitespace-nowrap"
            style={{ color: 'var(--text-muted)' }}
          >
            <Check size={14} aria-hidden="true" />
            {es ? 'Siempre activa' : 'Always on'}
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={encendida}
            disabled={!isAdmin || ocupada}
            onClick={() => alternar(zona)}
            aria-label={
              es
                ? `${encendida ? 'Ocultar' : 'Mostrar'} ${zona.titulo.es}`
                : `${encendida ? 'Hide' : 'Show'} ${zona.titulo.en}`
            }
            style={{
              width: '46px',
              height: '26px',
              flexShrink: 0,
              borderRadius: '13px',
              border: '1px solid var(--border)',
              background: encendida ? 'var(--accent)' : 'var(--bg-muted)',
              position: 'relative',
              cursor: !isAdmin || ocupada ? 'not-allowed' : 'pointer',
              opacity: ocupada ? 0.6 : 1,
              transition: 'background 160ms ease',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '3px',
                left: encendida ? '23px' : '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                // Sobre --accent va --accent-text: en las paletas de acento
                // pálido, blanco fijo dejaría el control sin contraste.
                background: encendida ? 'var(--accent-text)' : 'var(--text-muted)',
                transition: 'left 160ms ease',
              }}
            />
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {es ? 'Cargando…' : 'Loading…'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {es ? 'Zonas Activas' : 'Active Areas'}
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: '46rem' }}>
          {es
            ? 'Elige qué partes del producto aparecen en tu menú. Ocultar una zona no borra nada: los datos siguen guardados y vuelven al encenderla de nuevo.'
            : 'Choose which parts of the product appear in your menu. Hiding an area deletes nothing: the data stays and comes back when you turn it on again.'}
        </p>
      </div>

      {error && (
        <div
          className="text-sm p-3 rounded-lg"
          style={{ background: 'var(--bg-muted)', color: 'var(--danger)', border: '1px solid var(--border)' }}
        >
          {es ? 'No se pudieron cargar las zonas activas: ' : 'Could not load active areas: '}
          {error}
        </div>
      )}

      {!isAdmin && (
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {es
            ? 'Solo el propietario o un administrador puede cambiar estas opciones.'
            : 'Only the owner or an admin can change these settings.'}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {OPCIONALES.map(zona => <Fila key={zona.clave} zona={zona} fija={false} />)}
      </div>

      <div className="flex flex-col gap-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {es ? 'El núcleo del producto' : 'The product core'}
        </span>
        {NUCLEO.map(zona => <Fila key={zona.clave} zona={zona} fija />)}
      </div>
    </div>
  );
}

export default ActiveSurfacesPanel;
