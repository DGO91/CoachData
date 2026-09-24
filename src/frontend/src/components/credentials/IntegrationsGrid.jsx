// src/frontend/src/components/credentials/IntegrationsGrid.jsx
//
// Panorama de las conexiones del coach, arriba del Vault.
//
// Estructura tomada del componente de integraciones de 21st.dev: rejilla de
// tarjetas cuadradas en 2 · 3 · 2 con la marca en el centro. Lo que cambia es
// de dónde salen los datos: el original pinta logos de terceros como adorno, y
// aquí cada tarjeta muestra el estado REAL de esa herramienta para esta
// organización, resuelto con el mismo `resolveFieldState` que usan los campos
// de abajo. Una tarjeta nunca dice "Conectado" si el coach no ha guardado su
// clave.
import React from 'react';
import { CreditCard, FileText, CalendarDays, GraduationCap, MessageCircle, Users } from 'lucide-react';
import {
  getStatus,
  getFieldStatus,
  resolveFieldState,
  CONNECTED,
  AVAILABLE,
} from '../../core/config/integrations.registry';

// Las seis herramientas del plan del pulpo. El `id` es el mismo del registro y
// el mismo con el que se guarda la clave: si una no existe ahí, no se pinta.
//
// `campoSuelto` marca las que no viven en INTEGRATION_STATUS sino en
// STANDALONE_FIELD_STATUS, porque no tienen selector de proveedor. WhatsApp es
// una de esas: preguntando al registro equivocado salía como «Próximamente»
// aunque su integración funciona.
const HERRAMIENTAS = [
  { id: 'stripe',          nombre: 'Stripe',   icono: CreditCard },
  { id: 'tally',           nombre: 'Tally',    icono: FileText },
  { id: 'whatsapp_number', nombre: 'WhatsApp', icono: MessageCircle, campoSuelto: true },
  { id: 'calendly',        nombre: 'Calendly', icono: CalendarDays },
  { id: 'kajabi',          nombre: 'Kajabi',   icono: GraduationCap },
  { id: 'hubspot',         nombre: 'HubSpot',  icono: Users },
];

function Tarjeta({ herramienta, estado, etiqueta, onSelect }) {
  const { nombre, icono: Icono } = herramienta;
  const conectable = estado === AVAILABLE || estado === CONNECTED;
  const Elemento = conectable && onSelect ? 'button' : 'div';

  return (
    <Elemento
      type={Elemento === 'button' ? 'button' : undefined}
      onClick={conectable && onSelect ? () => onSelect(herramienta) : undefined}
      title={`${nombre} — ${etiqueta}`}
      className={`integration-card${conectable ? '' : ' is-soon'}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
        width: '92px', background: 'none', border: 'none', padding: 0,
        cursor: conectable && onSelect ? 'pointer' : 'default',
        font: 'inherit', color: 'inherit',
        opacity: conectable ? 1 : 0.5,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '72px', height: '72px', borderRadius: '16px',
        background: 'var(--bg-surface)',
        border: `1px solid ${estado === CONNECTED ? 'var(--success)' : 'var(--border)'}`,
        transition: 'border-color 140ms ease',
      }}>
        <Icono size={26} style={{ color: 'var(--accent-ink, var(--accent))' }} aria-hidden="true" />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
        {nombre}
      </span>
      {/* El estado va en texto, no solo en el color del borde. */}
      <span style={{
        fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        color: estado === CONNECTED ? 'var(--success)' : 'var(--text-muted)', whiteSpace: 'nowrap',
      }}>
        {etiqueta}
      </span>
    </Elemento>
  );
}

export default function IntegrationsGrid({ language = 'es', keys = {}, onSelect }) {
  const isEs = language === 'es';

  const etiquetas = {
    [CONNECTED]: isEs ? 'Conectado' : 'Connected',
    [AVAILABLE]: isEs ? 'Disponible' : 'Available',
    coming_soon: isEs ? 'Próximamente' : 'Coming soon',
  };

  const resueltas = HERRAMIENTAS.map((h) => {
    const estado = resolveFieldState({
      status: h.campoSuelto ? getFieldStatus(h.id) : getStatus(h.id),
      credentialValue: keys[h.id],
    });
    return { herramienta: h, estado, etiqueta: etiquetas[estado] };
  });

  const conectadas = resueltas.filter((r) => r.estado === CONNECTED).length;
  const disponibles = resueltas.filter((r) => r.estado === AVAILABLE).length;

  // `key` no va aquí: React avisa si llega por spread. Se pasa en cada <Tarjeta>.
  const props = (i) => ({ ...resueltas[i], onSelect });

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '32px', alignItems: 'center', padding: '24px',
      border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--bg-surface)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: 'fit-content', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <Tarjeta key={resueltas[0].herramienta.id} {...props(0)} />
          <Tarjeta key={resueltas[1].herramienta.id} {...props(1)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'flex-start' }}>
          <Tarjeta key={resueltas[2].herramienta.id} {...props(2)} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', width: '92px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px', borderRadius: '16px',
              background: 'var(--bg-surface)', border: '1px solid var(--accent)',
              boxShadow: 'var(--shadow-md)',
            }}>
              <img src="/de_aura_media_logo.png" alt="CoachData" style={{ width: '34px', height: '34px', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>CoachData</span>
          </div>
          <Tarjeta key={resueltas[3].herramienta.id} {...props(3)} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <Tarjeta key={resueltas[4].herramienta.id} {...props(4)} />
          <Tarjeta key={resueltas[5].herramienta.id} {...props(5)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {isEs ? 'Conecta las herramientas que ya usas' : 'Connect the tools you already use'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          {isEs
            ? 'Tu negocio sigue viviendo en las herramientas de siempre. CoachData las lee y reúne lo que pasa en un solo sitio, sin que cambies de sistema.'
            : 'Your business keeps living in the tools you already use. CoachData reads them and brings what happens together in one place, without you switching systems.'}
        </p>
        {/* Cifras reales de esta organización, no un contador de catálogo. */}
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {isEs
            ? `${conectadas} conectada(s) · ${disponibles} lista(s) para conectar`
            : `${conectadas} connected · ${disponibles} ready to connect`}
        </p>
      </div>
    </div>
  );
}
