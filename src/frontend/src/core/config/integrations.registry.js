/**
 * Estado real de cada integración del Security Vault.
 *
 * Existe porque el Vault ofrecía 39 herramientas y solo 4 hacían algo. Un coach
 * pegaba su clave de HubSpot, se cifraba con AES-256-GCM, se guardaba en
 * `client_provider_keys`… y ahí se quedaba, sin que nada la leyera nunca.
 * En la base hay 26 claves guardadas por usuarios reales en esa situación.
 *
 * Aceptar una credencial que no se va a usar es peor que no ofrecer la
 * integración: el usuario cree que ha conectado su negocio y toma decisiones
 * contando con datos que nunca van a llegar.
 *
 * ── Cómo se actualiza ────────────────────────────────────────────────
 * Una herramienta pasa a 'live' SOLO cuando existe el código que consume su
 * clave de punta a punta (webhook con firma verificada o llamada saliente real)
 * y está probado. No cuando el conector está "casi listo".
 *
 * Ver docs/PLAN_PULPO_INTEGRACIONES.md para el plan de las que faltan.
 */

/** Funciona de verdad: hay código que lee esta clave y hace algo con ella. */
export const LIVE = 'live';
/** Todavía no hay integración. El campo se muestra deshabilitado. */
export const SOON = 'soon';

/**
 * Estado por herramienta. La clave es el `id` que usa el <select> del Vault.
 * Verificado contra src/backend el 2026-08-11 buscando consumidores reales.
 */
export const INTEGRATION_STATUS = {
  // ── Pagos ──
  stripe: LIVE,          // webhooks/handlers/StripeWebhookHandler.js — firma verificada
  paypal: SOON,
  hotmart: SOON,
  thrivecart: SOON,
  razorpay: SOON,
  mercadopago: SOON,

  // ── Formularios ──
  tally: LIVE,           // webhooks/handlers/TallyWebhookHandler.js — HMAC-SHA256
  typeform: SOON,
  jotform: SOON,
  googleforms: SOON,

  // ── Agenda ──
  calendly: LIVE,

  // ── CRM ──
  // Consumidor real: NangoConnector('hubspot') lee los contactos por el proxy
  // de Nango y los vuelca a canonical_contact. Está registrado en el backfill
  // (connectionStatusRoutes.js) y cubierto por scripts/test-nango-connector.js.
  // Se conecta por OAuth: aquí no se le pide ninguna clave al coach.
  // Falta contrastarlo con una cuenta real. Si el primer backfill no trae
  // contactos, esto vuelve a SOON en vez de dejar la promesa colgada.
  hubspot: LIVE,
  gohighlevel: SOON,
  salesforce: SOON,
  pipedrive: SOON,
  keap: SOON,
  notion: SOON,

  // ── Email marketing ──
  activecampaign: SOON,
  mailchimp: SOON,
  convertkit: SOON,
  klaviyo: SOON,
  sendgrid: SOON,

  // ── Facturación ──
  quaderno: SOON,
  taxjar: SOON,
  holded: SOON,
  facturadirecta: SOON,
  quickbooks: SOON,
  xero: SOON,

  // ── Entrega de contenido ──
  kajabi: LIVE,
  skool: SOON,
  hotmartclub: SOON,
  wordpress: SOON,

  // ── Mensajería ──
  whatsapp: LIVE,
  telegram: SOON,
  'whatsapp-api': SOON,

  // ── Soporte ──
  zendesk: SOON,
  intercom: SOON,

  // ── Proveedores de IA ──
  // Se configuran en Modelos de IA y sí se usan; aquí solo aparecen como
  // alternativa al proveedor por defecto.
  groq: SOON,
  mistral: SOON,
  gemini: SOON,
  cohere: SOON,
};

/**
 * Campos sin selector de proveedor (una sola herramienta fija). Se listan
 * aparte porque su estado no depende de lo que elija el usuario.
 *
 * Las claves de IA se guardan cifradas pero el backend NO las lee: el
 * orquestador usa las de .env (AI_DEFAULT_PROVIDER y las *_API_KEY del
 * entorno). Hasta que getEffectiveAISettings las consuma de verdad, son una
 * promesa sin cumplir igual que las demás.
 */
export const STANDALONE_FIELD_STATUS = {
  whatsapp_number: LIVE,   // evolutionRoutes.js:66 lo lee de verdad
  scheduling_secret: LIVE,
  openai_key: LIVE,
  anthropic_key: LIVE,
  elevenlabs_key: LIVE,
};

export function getFieldStatus(providerKey) {
  return STANDALONE_FIELD_STATUS[providerKey] || SOON;
}

export function getStatus(id) {
  return INTEGRATION_STATUS[id] || SOON;
}

export function isLive(id) {
  return getStatus(id) === LIVE;
}

/**
 * Literal que devuelve el backend en lugar de la clave cuando ya hay una
 * guardada (credentialsUseCase.js:89). Es la única señal que tiene el frontend
 * para saber que el coach ya conectó esa herramienta: la clave real nunca baja.
 */
export const CONFIGURED_SENTINEL = '[Configured - Hidden for Security]';

/**
 * Solo cuenta como conectada una clave que el backend confirma tener guardada.
 * Lo que el coach esté tecleando en ese momento no lo es: hasta que pulse
 * guardar no hay nada en `client_provider_keys`, y pintar «Conectado» mientras
 * escribe sería exactamente la promesa falsa que estamos quitando.
 */
export function hasCredential(value) {
  return value === CONFIGURED_SENTINEL;
}

/**
 * Los tres estados que ve el coach en el Vault. El registro de arriba solo sabe
 * si existe la integración (LIVE/SOON); si además está conectada depende de que
 * ese coach haya guardado su clave, así que se resuelve aquí juntando ambas.
 *
 * Sin esta distinción, Stripe salía como «Conectado» en una cuenta recién
 * creada que no había introducido nada — el mismo problema que la Fase 0 vino
 * a arreglar, una casilla más abajo.
 */
export const CONNECTED   = 'connected';   // hay integración Y el coach guardó su clave
export const AVAILABLE   = 'available';   // hay integración, falta que la conecte
export const COMING_SOON = 'coming_soon'; // todavía no hay integración

export function resolveFieldState({ status, credentialValue }) {
  if (status !== LIVE) return COMING_SOON;
  return hasCredential(credentialValue) ? CONNECTED : AVAILABLE;
}

/**
 * Marca cada opción de un <select> con su estado, para que la lista muestre
 * cuáles funcionan sin tener que seleccionarlas una por una.
 */
export function withStatus(options) {
  return options.map((o) => ({ ...o, status: getStatus(o.id) }));
}

/**
 * Cuántas funcionan de verdad, para el aviso de la cabecera.
 * Cuenta los dos registros: dejar fuera los campos sin selector (WhatsApp)
 * infravaloraría lo que sí está hecho, y la honestidad va en las dos
 * direcciones.
 */
const ALL_STATUSES = { ...INTEGRATION_STATUS, ...STANDALONE_FIELD_STATUS };
export const LIVE_COUNT = Object.values(ALL_STATUSES).filter((s) => s === LIVE).length;
export const TOTAL_COUNT = Object.keys(ALL_STATUSES).length;
