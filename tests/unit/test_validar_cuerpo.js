'use strict';

/**
 * La capa de validación y el esquema de credenciales.
 *
 * Lo que más importa aquí no es rechazar basura, es NO rechazar lo que ya
 * funciona: en producción hay dieciocho combinaciones de proveedor y una
 * validación demasiado estricta dejaría a clientes sin poder guardar su clave.
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validarCuerpo } = require('../../src/backend/infrastructure/web/validation/validarCuerpo');

const ESQUEMA_CLAVE = {
  type: 'object',
  required: ['provider_name'],
  additionalProperties: false,
  properties: {
    provider_name: { type: 'string', minLength: 2, maxLength: 64, pattern: '^[a-z0-9_]+$' },
    provider_type: { type: 'string', minLength: 2, maxLength: 32, pattern: '^[a-z0-9_]+$' },
    api_key_plaintext: { type: 'string', maxLength: 16384 }
  }
};

/** Ejecuta el middleware sin levantar Express. */
function probar(esquema, cuerpo) {
  const req = { body: cuerpo, method: 'POST', originalUrl: '/api/tenant/keys' };
  let estado = null;
  let respuesta = null;
  let siguiente = false;
  const res = {
    status(c) { estado = c; return this; },
    json(j) { respuesta = j; return this; }
  };
  validarCuerpo(esquema)(req, res, () => { siguiente = true; });
  return { pasa: siguiente, estado, respuesta, cuerpo: req.body };
}

/* Los dieciocho pares que hay hoy en client_provider_keys. */
const REALES = [
  ['calendar', 'calendly'], ['crm', 'crm_api'], ['crm', 'crm_provider'],
  ['ai', 'custom_llm_provider'], ['crm', 'email_provider'], ['crm', 'form_provider'],
  ['payment', 'gateway_provider'], ['identity', 'google_calendar_oauth'],
  ['identity', 'google_mail_oauth'], ['invoice', 'invoice_provider'],
  ['nango_connection', 'notion'], ['delivery', 'portal_provider'],
  ['payments', 'stripe'], ['support', 'support_provider'], ['forms', 'tally'],
  ['messaging', 'whatsapp'], ['identity', 'whatsapp_api_key'],
  ['identity', 'whatsapp_number']
];

test('los dieciocho proveedores en producción siguen pasando', () => {
  for (const [tipo, nombre] of REALES) {
    const r = probar(ESQUEMA_CLAVE, {
      provider_type: tipo, provider_name: nombre, api_key_plaintext: 'valor'
    });
    assert.equal(r.pasa, true, `${tipo}/${nombre} fue rechazado y no debería`);
  }
});

test('el token OAuth de Google cabe: es un JSON, no una clave suelta', () => {
  const token = JSON.stringify({
    token: 'x'.repeat(2000), refresh_token: 'y'.repeat(500),
    expiry: '2026-12-01T00:00:00Z', scopes: ['calendar', 'gmail']
  });
  const r = probar(ESQUEMA_CLAVE, { provider_name: 'google_mail_oauth', api_key_plaintext: token });
  assert.equal(r.pasa, true);
});

test('rechaza lo que antes entraba sin mirar', () => {
  assert.equal(probar(ESQUEMA_CLAVE, {}).pasa, false, 'sin provider_name');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: 'a' }).pasa, false, 'demasiado corto');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: 'x'.repeat(65) }).pasa, false, 'demasiado largo');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: 'Google OAuth' }).pasa, false, 'espacios y mayúsculas');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: '../../etc/passwd' }).pasa, false, 'recorrido de ruta');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: "stripe'; drop table--" }).pasa, false, 'inyección');
  assert.equal(probar(ESQUEMA_CLAVE, { provider_name: 'stripe' + String.fromCharCode(0) }).pasa, false, 'byte nulo');
  assert.equal(probar(ESQUEMA_CLAVE, {
    provider_name: 'stripe', api_key_plaintext: 'x'.repeat(16385)
  }).pasa, false, 'clave desmesurada');
});

test('un cuerpo que no es objeto no pasa', () => {
  assert.equal(probar(ESQUEMA_CLAVE, 'texto suelto').pasa, false);
  assert.equal(probar(ESQUEMA_CLAVE, [1, 2, 3]).pasa, false);
});

test('las propiedades de más se descartan, no rompen la petición', () => {
  // Un cliente antiguo que manda un campo extra no debe recibir un 400; el
  // campo simplemente no llega a la capa de aplicación.
  const r = probar(ESQUEMA_CLAVE, {
    provider_name: 'stripe', api_key_plaintext: 'sk_test', tenant_id: 'otro-inquilino'
  });
  assert.equal(r.pasa, true);
  assert.equal(r.cuerpo.tenant_id, undefined, 'tenant_id debería haberse descartado');
});

test('el error dice qué falla, sin devolver el valor', () => {
  const r = probar(ESQUEMA_CLAVE, { provider_name: 'MAL NOMBRE', api_key_plaintext: 'sk_secreto' });
  assert.equal(r.estado, 400);
  assert.ok(Array.isArray(r.respuesta.detalles));
  assert.match(r.respuesta.detalles.join(' '), /provider_name/);
  assert.ok(!JSON.stringify(r.respuesta).includes('sk_secreto'), 'la respuesta no debe repetir la credencial');
});

test('los tipos se convierten cuando el esquema lo permite', () => {
  const esquema = {
    type: 'object',
    properties: { hora: { type: 'integer', minimum: 0, maximum: 23 } }
  };
  const r = probar(esquema, { hora: '14' });
  assert.equal(r.pasa, true);
  assert.equal(r.cuerpo.hora, 14, 'debería ser número, no texto');
  assert.equal(probar(esquema, { hora: '99' }).pasa, false);
});
