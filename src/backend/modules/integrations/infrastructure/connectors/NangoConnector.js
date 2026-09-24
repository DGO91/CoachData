'use strict';

const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes } = require('../../domain/EntityTypes');

/**
 * NangoConnector — lee datos de una herramienta a través del proxy de Nango y
 * los vuelca al modelo canónico.
 *
 * Por qué existe: hasta ahora conectar por OAuth solo guardaba la autorización.
 * El coach veía «Conectado» y no llegaba ni un dato, porque nadie iba a
 * buscarlos. Autorizar no es leer; esta clase es la parte de leer.
 *
 * Un conector por herramienta, pero un solo archivo: lo único que cambia entre
 * HubSpot, Notion o HighLevel es qué endpoint se pide y cómo se traduce cada
 * registro. Añadir la siguiente es añadir una entrada a PROVEEDORES.
 *
 * La clave secreta de Nango vive solo aquí (servidor). El `connection_id` de
 * cada coach se guardó cifrado al autorizar, y llega en `credentials`.
 */

const NANGO_API = 'https://api.nango.dev';

/**
 * Catálogo de proveedores.
 *
 * - `nangoId`      : el integration id tal cual está dado de alta en Nango.
 * - `credentialKey`: bajo qué nombre se guardó el connection_id en el vault
 *                    (lo escribe nangoRoutes.js con el provider_config_key).
 * - `path`         : ruta de la API de la herramienta, que Nango reenvía.
 * - `extraer`      : saca la lista de registros de la respuesta.
 * - `siguiente`    : devuelve el cursor de la página siguiente, o null.
 * - `mapear`       : traduce un registro al evento canónico.
 */
const PROVEEDORES = {
  hubspot: {
    nangoId: 'hubspot',
    credentialKey: 'hubspot',
    entityType: EntityTypes.CONTACT,
    path: '/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,createdate',
    extraer: (r) => r?.results || [],
    siguiente: (r) => r?.paging?.next?.after || null,
    conCursor: (path, cursor) => `${path}&after=${encodeURIComponent(cursor)}`,
    mapear: (item) => {
      const p = item.properties || {};
      const email = (p.email || '').trim().toLowerCase();
      // Sin email no hay forma de cruzarlo con el resto del pulpo (formularios,
      // pagos y sesiones se unen por correo). Se descarta en vez de crear un
      // contacto huérfano que nunca casará con nada.
      if (!email) return null;
      const nombre = [p.firstname, p.lastname].filter(Boolean).join(' ').trim();
      return {
        sourceId: `hubspot_contact_${item.id}`,
        fields: { email, full_name: nombre || null, phone: p.phone || null },
        occurredAt: p.createdate ? new Date(p.createdate) : null,
        rawPayload: { hubspot_id: item.id, properties: p },
      };
    },
  },
};

class NangoConnector {
  /**
   * @param {string} proveedorId — clave de PROVEEDORES, p. ej. 'hubspot'
   */
  constructor(proveedorId) {
    const def = PROVEEDORES[proveedorId];
    if (!def) {
      throw new Error(`[NangoConnector] Proveedor no soportado: '${proveedorId}'. Añádelo a PROVEEDORES.`);
    }
    this._id = proveedorId;
    this._def = def;
  }

  get id() { return this._id; }
  get category() { return 'crm'; }
  get auth() { return 'nango'; }
  get capabilities() { return [this._def.entityType]; }

  /**
   * Estas herramientas no entran por webhook todavía: los datos se traen con
   * backfill. Falla cerrado a propósito — si algún día llega un webhook sin
   * que exista verificación de firma, tiene que romper, no colarse.
   */
  verifySignature() {
    throw new Error(`[NangoConnector:${this._id}] No hay verificación de firma para este proveedor todavía.`);
  }

  parseWebhook() {
    return [];
  }

  /**
   * Trae los registros de la herramienta y los devuelve como eventos canónicos.
   *
   * @param {object} credentials    — claves descifradas del tenant
   * @param {Date}   since          — solo registros posteriores a esta fecha
   * @param {string} organizationId
   * @returns {Promise<CanonicalEvent[]>}
   */
  async backfill(credentials, since, organizationId) {
    const eventos = [];
    const connectionId = credentials?.[this._def.credentialKey];

    if (!connectionId) {
      // No es un error: significa que este coach no ha conectado esta
      // herramienta. Se dice en voz alta para que no parezca que sí trajo algo.
      console.warn(`[NangoConnector:${this._id}] Sin conexión guardada — no hay nada que traer.`);
      return eventos;
    }

    const secret = process.env.NANGO_SECRET_KEY;
    if (!secret) {
      throw new Error('[NangoConnector] NANGO_SECRET_KEY no está configurada: no se puede leer nada.');
    }

    const desde = since instanceof Date ? since.getTime() : 0;
    let path = this._def.path;
    let paginas = 0;

    // Tope de páginas: una cuenta grande podría paginar indefinidamente y
    // dejar la petición colgada. Mejor traer un trozo acotado y volver.
    while (path && paginas < 20) {
      const res = await fetch(`${NANGO_API}/proxy${path}`, {
        headers: {
          'Authorization': `Bearer ${secret}`,
          'Connection-Id': connectionId,
          'Provider-Config-Key': this._def.nangoId,
        },
      });

      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        const detalle = cuerpo?.error?.message || cuerpo?.message || `HTTP ${res.status}`;
        throw new Error(`[NangoConnector:${this._id}] La herramienta respondió: ${detalle}`);
      }

      for (const item of this._def.extraer(cuerpo)) {
        const mapeado = this._def.mapear(item);
        if (!mapeado) continue;
        // El filtro por fecha va aquí y no en la petición: no todas las APIs
        // permiten filtrar por fecha de creación de la misma forma.
        if (desde && mapeado.occurredAt && mapeado.occurredAt.getTime() < desde) continue;

        eventos.push(new CanonicalEvent({
          entityType: this._def.entityType,
          organizationId,
          sourceProvider: this._id,
          sourceId: mapeado.sourceId,
          fields: mapeado.fields,
          rawPayload: mapeado.rawPayload,
          occurredAt: mapeado.occurredAt,
        }));
      }

      const cursor = this._def.siguiente(cuerpo);
      path = cursor ? this._def.conCursor(this._def.path, cursor) : null;
      paginas += 1;
    }

    console.log(`[NangoConnector:${this._id}] ${eventos.length} registros traídos para la organización ${organizationId}.`);
    return eventos;
  }
}

module.exports = { NangoConnector, PROVEEDORES };
