/**
 * test-stripe-webhook.js
 * Verifica el camino único de webhooks de Stripe: POST /api/billing/webhooks/stripe.
 *
 * Tres fallos independientes lo mantenían inservible, y cada uno habría bastado
 * para que arreglar los otros dos no sirviera de nada:
 *   1. Vivía en billingRoutes, montado detrás de authMiddleware. Stripe no envía
 *      JWT: sus eventos morían en 401.
 *   2. Su express.raw() se registraba después del express.json() global, así que
 *      la firma se validaba contra un cuerpo ya parseado y nunca podía cuadrar.
 *   3. Con NODE_ENV=development —el valor del .env de este repositorio— se
 *      saltaba la verificación de firma por completo.
 *
 * Firma los eventos de prueba con el algoritmo real de Stripe (HMAC-SHA256 sobre
 * "timestamp.payload"), de modo que el test comprueba la verificación de verdad
 * en lugar de simularla.
 */
require('dotenv').config();
const http = require('http');
const crypto = require('crypto');

const SECRET_PRUEBA = 'whsec_' + 'a'.repeat(32);
// Se fijan antes de construir la app: el router los lee de process.env.
process.env.STRIPE_WEBHOOK_SECRET = SECRET_PRUEBA;
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_' + 'b'.repeat(24);

const { createApp } = require('../src/backend/infrastructure/web/app');

function firmar(payload, secret, timestamp) {
  const firma = crypto.createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8').digest('hex');
  return `t=${timestamp},v1=${firma}`;
}

function post(port, path, rawBody, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: '127.0.0.1', port, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawBody),
        ...headers
      }
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', reject);
    r.write(rawBody);
    r.end();
  });
}

(async () => {
  const server = createApp([]).listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;
  let failed = 0;
  const check = (name, cond, detail) => {
    if (cond) console.log(`[PASS] ${name}`);
    else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
  };

  const RUTA = '/api/billing/webhooks/stripe';
  const payload = JSON.stringify({
    id: 'evt_test_' + Date.now(),
    type: 'customer.subscription.updated',
    data: { object: { metadata: { organization_id: '11111111-1111-1111-1111-111111111111' } } }
  });
  const ts = Math.floor(Date.now() / 1000);

  // 1. Con firma válida NO puede haber 401: el router está fuera de authMiddleware.
  const ok = await post(port, RUTA, payload, { 'stripe-signature': firmar(payload, SECRET_PRUEBA, ts) });
  check('firma válida: no exige sesión (no es 401)', ok.status !== 401, `status=${ok.status}`);

  // 2. Y la firma cuadra, lo que prueba que constructEvent recibió los bytes
  //    crudos: si express.json() hubiera consumido el cuerpo antes, este mismo
  //    evento daría 400 por firma inválida.
  check('firma válida: se acepta el evento (cuerpo crudo intacto)',
    ok.status === 200, `status=${ok.status} body=${ok.body.slice(0, 120)}`);

  // 3. Firma manipulada: debe rechazarse. Es el control que demuestra que la
  //    verificación se ejecuta de verdad y no que todo devuelve 200.
  const mala = await post(port, RUTA, payload, { 'stripe-signature': `t=${ts},v1=${'0'.repeat(64)}` });
  check('firma inválida: se rechaza con 400', mala.status === 400, `status=${mala.status}`);

  // 4. Sin cabecera de firma tampoco se procesa.
  const sinFirma = await post(port, RUTA, payload);
  check('sin cabecera de firma: se rechaza con 400', sinFirma.status === 400, `status=${sinFirma.status}`);

  // 5. El cuerpo alterado invalida la firma aunque el resto coincida.
  const alterado = payload.replace('customer.subscription.updated', 'invoice.paid');
  const manipulado = await post(port, RUTA, alterado, { 'stripe-signature': firmar(payload, SECRET_PRUEBA, ts) });
  check('cuerpo alterado tras firmar: se rechaza con 400', manipulado.status === 400, `status=${manipulado.status}`);

  // 6. El dispatcher canónico ya no atiende Stripe: un evento suyo por esa vía
  //    debe quedar sin handler en lugar de procesarse por segundo camino.
  const canonico = await post(port,
    '/api/webhooks/11111111-1111-1111-1111-111111111111/stripe', payload);
  check('el dispatcher canónico ya no procesa Stripe',
    canonico.status !== 200, `status=${canonico.status} body=${canonico.body.slice(0, 100)}`);

  server.close();
  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
