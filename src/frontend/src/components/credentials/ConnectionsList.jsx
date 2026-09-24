// src/frontend/src/components/credentials/ConnectionsList.jsx
//
// El Vault como lista: una fila por herramienta, con su estado y su acción.
//
// Antes eran cinco módulos con un <select> de proveedor por categoría. El
// problema no era estético: un <select> nativo sin valor pinta igualmente su
// primera opción, así que la pantalla enseñaba «Stripe» mientras por dentro no
// había ninguna elección — el campo se bloqueaba con «Próximamente» y Stripe,
// que funciona, no se podía conectar. Sin selector no hay estado fantasma.
//
// El modelo de datos NO cambia: cada categoría sigue guardando su par
// `*_provider` + `*_key`, que es lo que lee el backend. Elegir una fila escribe
// el proveedor de su categoría, exactamente igual que hacía el <select>.
import React, { useState } from 'react';
import { Check, Clock, Save, Plug, X, RefreshCw } from 'lucide-react';
import {
  getStatus,
  getFieldStatus,
  resolveFieldState,
  CONNECTED,
  AVAILABLE,
  COMING_SOON,
  CONFIGURED_SENTINEL,
} from '../../core/config/integrations.registry';

/**
 * Catálogo de la lista. Los `id`, `providerField`, `keyField` y `providerType`
 * son exactamente los que ya usaban los campos del Vault: esto cambia cómo se
 * ve, no dónde se guarda.
 *
 * `campoSuelto` marca las que no tienen selector de categoría (su estado vive
 * en STANDALONE_FIELD_STATUS y su clave se guarda en su propio campo).
 */
const CATALOGO = [
  {
    categoria: { es: 'Pagos y facturación', en: 'Payments & invoicing' },
    herramientas: [
      { id: 'stripe', nombre: 'Stripe', providerField: 'gateway_provider', keyField: 'stripe_key', providerType: 'payment',
        desc: { es: 'Cobros y suscripciones', en: 'Payments and subscriptions' } },
      { id: 'paypal', nombre: 'PayPal', providerField: 'gateway_provider', keyField: 'stripe_key', providerType: 'payment',
        desc: { es: 'Cobros', en: 'Payments' } },
      { id: 'hotmart', nombre: 'Hotmart', providerField: 'gateway_provider', keyField: 'stripe_key', providerType: 'payment',
        desc: { es: 'Venta de infoproductos', en: 'Digital product sales' } },
      { id: 'quaderno', nombre: 'Quaderno', providerField: 'invoice_provider', keyField: 'invoice_key', providerType: 'invoice',
        desc: { es: 'Facturación e impuestos', en: 'Invoicing and taxes' } },
    ],
  },
  {
    categoria: { es: 'Captación', en: 'Lead capture' },
    herramientas: [
      { id: 'tally', nombre: 'Tally', providerField: 'form_provider', keyField: 'form_secret', providerType: 'crm',
        desc: { es: 'Formularios de captación', en: 'Lead capture forms' } },
      { id: 'typeform', nombre: 'Typeform', providerField: 'form_provider', keyField: 'form_secret', providerType: 'crm',
        desc: { es: 'Formularios', en: 'Forms' } },
      { id: 'jotform', nombre: 'Jotform', providerField: 'form_provider', keyField: 'form_secret', providerType: 'crm',
        desc: { es: 'Formularios', en: 'Forms' } },
    ],
  },
  {
    categoria: { es: 'Agenda y sesiones', en: 'Scheduling' },
    herramientas: [
      // Por Nango: el coach autoriza con su cuenta y nunca ve una clave.
      // `keyField` es el propio id porque el callback de Nango guarda la
      // conexión bajo el provider_config_key (ver nangoRoutes.js).
      { id: 'calendly', nombre: 'Calendly', keyField: 'calendly', providerType: 'scheduling', nangoId: 'calendly',
        desc: { es: 'Reservas y sesiones', en: 'Bookings and sessions' } },
    ],
  },
  {
    categoria: { es: 'Mensajes', en: 'Messaging' },
    herramientas: [
      { id: 'whatsapp_number', nombre: 'WhatsApp', keyField: 'whatsapp_number', providerType: 'identity', campoSuelto: true, tipo: 'text',
        desc: { es: 'Número donde recibes tus reportes', en: 'Number where you get your reports' } },
    ],
  },
  {
    categoria: { es: 'CRM y correo', en: 'CRM & email' },
    herramientas: [
      { id: 'hubspot', nombre: 'HubSpot', keyField: 'hubspot', providerType: 'crm', nangoId: 'hubspot',
        desc: { es: 'CRM', en: 'CRM' } },
      { id: 'notion', nombre: 'Notion', keyField: 'notion', providerType: 'crm', nangoId: 'notion',
        desc: { es: 'Base de datos y CRM', en: 'Database and CRM' } },
      { id: 'gohighlevel', nombre: 'HighLevel', keyField: 'gohighlevel', providerType: 'crm', nangoId: 'highlevel-white-label',
        desc: { es: 'CRM y automatizaciones', en: 'CRM and automations' } },
      { id: 'mailchimp', nombre: 'Mailchimp', keyField: 'mailchimp', providerType: 'crm', nangoId: 'mailchimp',
        desc: { es: 'Email marketing', en: 'Email marketing' } },
      { id: 'activecampaign', nombre: 'ActiveCampaign', keyField: 'activecampaign', providerType: 'crm', nangoId: 'activecampaign',
        desc: { es: 'Email marketing', en: 'Email marketing' } },
    ],
  },
  {
    categoria: { es: 'Programas y contenidos', en: 'Programs & content' },
    herramientas: [
      { id: 'kajabi', nombre: 'Kajabi', providerField: 'portal_provider', keyField: 'delivery_key', providerType: 'delivery',
        desc: { es: 'Plataforma de programas', en: 'Course platform' } },
      { id: 'skool', nombre: 'Skool', providerField: 'portal_provider', keyField: 'delivery_key', providerType: 'delivery',
        desc: { es: 'Comunidad y programas', en: 'Community and courses' } },
    ],
  },
];

const ORDEN_ESTADO = { [CONNECTED]: 0, [AVAILABLE]: 1, [COMING_SOON]: 2 };

export default function ConnectionsList({
  language = 'es',
  keys = {},
  saving,
  onKeyChange,
  onSave,
  onChooseProvider,
  tenantId,
  onNangoConnected,
  onNangoError,
}) {
  const isEs = language === 'es';
  const [abierta, setAbierta] = useState(null);
  const [autorizando, setAutorizando] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const handleTriggerSync = async (herramienta) => {
    setSyncing(herramienta.id);
    setSyncFeedback(null);
    try {
      const { getAuthHeaders } = await import('../../hooks/useAutomationDispatcher');
      const headers = await getAuthHeaders();
      const res = await fetch('/api/integrations/trigger-backfill', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: herramienta.id, sinceDays: 90 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSyncFeedback({
        id: herramienta.id,
        text: isEs ? `Sincronizados ${data.ingested || 0} registros.` : `Synced ${data.ingested || 0} records.`,
      });
      setTimeout(() => setSyncFeedback(null), 4000);
      onNangoConnected?.(herramienta.nombre);
    } catch (err) {
      setSyncFeedback({
        id: herramienta.id,
        isError: true,
        text: isEs ? `Error: ${err.message}` : `Error: ${err.message}`,
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setSyncing(null);
    }
  };

  /**
   * Conexión por OAuth con Nango: el coach autoriza en la ventana de la propia
   * herramienta y aquí no se ve, ni se pide, ni se guarda ninguna clave suya.
   * Pedirle que busque y pegue un token era la mayor fricción del Vault.
   *
   * El token de sesión lo firma el backend contra la organización del usuario
   * (`/api/nango/session-token`); el navegador nunca toca NANGO_SECRET_KEY.
   */
  const conectarConNango = async (herramienta) => {
    if (!tenantId) {
      onNangoError?.(isEs
        ? 'Todavía no se ha resuelto tu organización. Recarga la página e inténtalo de nuevo.'
        : 'Your organization has not been resolved yet. Reload the page and try again.');
      return;
    }
    setAutorizando(herramienta.id);
    try {
      const { default: Nango } = await import('@nangohq/frontend');
      const { getAuthHeaders } = await import('../../hooks/useAutomationDispatcher');

      const headers = await getAuthHeaders();
      const res = await fetch('/api/nango/session-token', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId, integrationId: herramienta.nangoId }),
      });

      // Una ruta que no existe devuelve 200 con el HTML del SPA, así que
      // comprobar res.ok no basta: hay que confirmar que el cuerpo es JSON.
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.token) throw new Error(data.error || 'sin token de sesión');

      const nango = new Nango();
      const ui = nango.openConnectUI({
        onEvent: async (evento) => {
          if (evento.type === 'connect') {
            const { providerConfigKey, connectionId } = evento.payload;
            // Registrar la conexión en nuestro lado: sin esto el coach
            // autoriza en la herramienta y la plataforma no se entera.
            await fetch('/api/nango/callback', {
              method: 'POST',
              headers: await getAuthHeaders(),
              body: JSON.stringify({
                connection_id: connectionId,
                provider_config_key: providerConfigKey,
                tenant_id: tenantId,
              }),
            });
            ui.close();
            setAutorizando(null);
            onNangoConnected?.(herramienta.nombre);
          } else if (evento.type === 'error') {
            setAutorizando(null);
            onNangoError?.(evento.payload?.errorMessage || 'Error de autorización');
          } else if (evento.type === 'close') {
            setAutorizando(null);
          }
        },
      });
      ui.setSessionToken(data.token);
    } catch (err) {
      setAutorizando(null);
      onNangoError?.(isEs
        ? `No se pudo abrir la conexión: ${err.message}`
        : `Could not open the connection: ${err.message}`);
    }
  };

  const etiquetas = {
    [CONNECTED]: isEs ? 'Conectado' : 'Connected',
    [AVAILABLE]: isEs ? 'Disponible' : 'Available',
    [COMING_SOON]: isEs ? 'Próximamente' : 'Coming soon',
  };

  // Una herramienta solo puede estar conectada si es LA elegida de su
  // categoría: Stripe y PayPal comparten campo de clave, y sin esta condición
  // guardar la de uno pondría «Conectado» también en el otro.
  const estadoDe = (h) => {
    const status = h.campoSuelto ? getFieldStatus(h.id) : getStatus(h.id);
    const esLaElegida = h.providerField ? keys[h.providerField] === h.id : true;
    return resolveFieldState({
      status,
      credentialValue: esLaElegida ? keys[h.keyField] : undefined,
    });
  };

  const abrir = (h, estado) => {
    if (estado === COMING_SOON) return;
    // Las de OAuth no piden clave: abren la ventana de la herramienta.
    if (h.nangoId) { conectarConNango(h); return; }
    if (abierta === h.id) { setAbierta(null); return; }
    // Elegir la fila es lo que antes hacía el <select>: fija el proveedor de la
    // categoría antes de pedir la clave.
    if (h.providerField && keys[h.providerField] !== h.id) {
      onChooseProvider(h.providerType, h.providerField, h.id);
    }
    setAbierta(h.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {CATALOGO.map((grupo) => {
        const filas = grupo.herramientas
          .map((h) => ({ h, estado: estadoDe(h) }))
          .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]);

        return (
          <section key={grupo.categoria.en}>
            <h4 style={{
              fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--text-muted)', margin: '0 0 10px 2px',
            }}>
              {isEs ? grupo.categoria.es : grupo.categoria.en}
            </h4>

            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {filas.map(({ h, estado }, i) => {
                const bloqueada = estado === COMING_SOON;
                const conectada = estado === CONNECTED;
                const estaAbierta = abierta === h.id;
                const valor = keys[h.keyField] || '';

                return (
                  <div key={h.id} style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 16px', opacity: bloqueada ? 0.55 : 1,
                    }}>
                      <span aria-hidden="true" style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: conectada ? 'var(--success)' : bloqueada ? 'var(--text-muted)' : 'var(--accent)',
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {h.nombre}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {isEs ? h.desc.es : h.desc.en}
                        </div>
                      </div>

                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                        padding: '3px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
                        background: conectada ? 'var(--success-bg)' : 'var(--bg-muted)',
                        color: conectada ? 'var(--success)' : bloqueada ? 'var(--text-muted)' : 'var(--accent-ink, var(--accent))',
                      }}>
                        {conectada ? <Check size={10} aria-hidden="true" /> : bloqueada ? <Clock size={10} aria-hidden="true" /> : <Plug size={10} aria-hidden="true" />}
                        {etiquetas[estado]}
                      </span>

                      {/* Botón de sincronización manual para herramientas conectadas */}
                      {conectada && (
                        <button
                          type="button"
                          onClick={() => handleTriggerSync(h)}
                          disabled={syncing === h.id}
                          title={isEs ? 'Traer datos históricos de esta herramienta' : 'Pull historical data from this tool'}
                          style={{
                            height: '30px', padding: '0 10px', borderRadius: '8px', flexShrink: 0,
                            border: '1px solid var(--border)', background: 'var(--bg-muted)',
                            color: 'var(--text-primary)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                          }}
                        >
                          <RefreshCw size={12} className={syncing === h.id ? 'animate-spin' : ''} aria-hidden="true" />
                          {syncing === h.id ? (isEs ? 'Sincronizando…' : 'Syncing…') : (isEs ? 'Sincronizar' : 'Sync')}
                        </button>
                      )}

                      {/* El botón dice siempre qué va a pasar al pulsarlo: quien
                          ya tiene una conexión funcionando no debería leer
                          «Conectar» y sobrescribirla sin querer. */}
                      {!bloqueada && (
                        <button
                          type="button"
                          onClick={() => abrir(h, estado)}
                          style={{
                            height: '30px', padding: '0 12px', borderRadius: '8px', flexShrink: 0,
                            border: '1px solid var(--border)', background: conectada ? 'transparent' : 'var(--accent)',
                            color: conectada ? 'var(--text-primary)' : 'var(--accent-text, #fff)',
                            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          {autorizando === h.id
                            ? (isEs ? 'Abriendo…' : 'Opening…')
                            : estaAbierta
                              ? (<><X size={13} aria-hidden="true" />{isEs ? 'Cerrar' : 'Close'}</>)
                              : conectada
                                // Por OAuth no hay clave que cambiar: se
                                // vuelve a autorizar la cuenta.
                                ? (h.nangoId
                                    ? (isEs ? 'Reconectar' : 'Reconnect')
                                    : (isEs ? 'Cambiar clave' : 'Change key'))
                                : (isEs ? 'Conectar' : 'Connect')}
                        </button>
                      )}
                    </div>

                    {syncFeedback && syncFeedback.id === h.id && (
                      <div style={{
                        padding: '4px 16px 8px 36px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: syncFeedback.isError ? 'var(--crit, #ef4444)' : 'var(--success, #22c55e)',
                      }}>
                        {syncFeedback.text}
                      </div>
                    )}

                    {estaAbierta && (
                      <div style={{
                        display: 'flex', gap: '8px', alignItems: 'center',
                        padding: '0 16px 14px 36px',
                      }}>
                        <input
                          type={h.tipo === 'text' ? 'text' : 'password'}
                          aria-label={`${h.nombre} — ${isEs ? 'clave' : 'key'}`}
                          value={valor}
                          autoFocus
                          onChange={(e) => onKeyChange(h.keyField, e.target.value)}
                          placeholder={isEs ? 'Pega aquí tu clave' : 'Paste your key here'}
                          style={{
                            flex: 1, height: '38px', borderRadius: '10px', padding: '0 14px',
                            fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg-root)',
                            color: 'var(--text-primary)', border: '1px solid var(--border)', outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => onSave(h.providerType, h.keyField)}
                          disabled={saving || !valor || valor === CONFIGURED_SENTINEL}
                          style={{
                            height: '38px', padding: '0 14px', borderRadius: '10px',
                            border: 'none', background: 'var(--accent)', color: 'var(--accent-text, #fff)',
                            fontSize: '13px', fontWeight: 600,
                            cursor: saving || !valor ? 'not-allowed' : 'pointer',
                            opacity: saving || !valor || valor === CONFIGURED_SENTINEL ? 0.5 : 1,
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <Save size={14} aria-hidden="true" />
                          {isEs ? 'Guardar' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
