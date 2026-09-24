/**
 * Verifica que /api/webhooks quedó montado de verdad.
 * Aplica la regla de e2e_testing: assert sobre content-type y cuerpo,
 * NUNCA sobre status a secas — el catch-all app.get('*') devuelve 200 con HTML
 * para cualquier ruta inexistente, así que un 200 no prueba nada por sí solo.
 */
require('dotenv').config();
const http = require('http');
const assert = require('assert');
const { createApp } = require('../src/backend/infrastructure/web/app');

function req(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, ctype: res.headers['content-type'] || '', body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const app = createApp([]);
  const server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;
  let failed = 0;
  const check = (name, cond, detail) => {
    if (cond) { console.log(`[PASS] ${name}`); }
    else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
  };

  // 1. Verificación de Meta WhatsApp: challenge correcto -> eco del challenge
  const wa = await req(port, 'GET', '/api/webhooks/whatsapp_cloud?hub.mode=subscribe&hub.verify_token=coachdata_wa_token&hub.challenge=ABC123');
  check('GET whatsapp_cloud devuelve el challenge', wa.status === 200 && wa.body === 'ABC123',
    `status=${wa.status} body=${wa.body.slice(0, 60)}`);

  // 2. Token equivocado -> 403 (prueba que ejecuta el handler, no el catch-all)
  const waBad = await req(port, 'GET', '/api/webhooks/whatsapp_cloud?hub.mode=subscribe&hub.verify_token=NO&hub.challenge=X');
  check('GET whatsapp_cloud con token malo -> 403', waBad.status === 403, `status=${waBad.status}`);

  // 3. POST al dispatcher: debe responder JSON, NO el index.html del catch-all
  const post = await req(port, 'POST', '/api/webhooks/11111111-1111-1111-1111-111111111111/stripe', { id: 'evt_test', type: 'ping' });
  check('POST dispatcher responde JSON (no HTML del catch-all)',
    post.ctype.includes('application/json'), `content-type=${post.ctype} status=${post.status}`);
  check('POST dispatcher NO exige JWT (no es 401)', post.status !== 401, `status=${post.status}`);

  // 4. CONTROL NEGATIVO: una ruta que de verdad no existe SÍ debe caer al catch-all.
  //    Sin esto, los checks de arriba podrían estar pasando por accidente.
  const ghost = await req(port, 'GET', '/api/webhooks-que-no-existe/nada');
  check('CONTROL: ruta inexistente sí cae al catch-all HTML',
    ghost.ctype.includes('text/html'), `content-type=${ghost.ctype}`);

  // 5. El webhook de Stripe ya no está detrás de authMiddleware. Devolvía 401
  //    porque vivía dentro de billingRoutes; ahora tiene router propio, montado
  //    sin auth y antes del parser JSON. Sin STRIPE_WEBHOOK_SECRET responde 503
  //    y con firma inválida 400, pero nunca 401: eso significaría que ha vuelto
  //    a quedar detrás de la sesión, y Stripe jamás podría entregarle un evento.
  //    La verificación de firma en sí la cubre scripts/test-stripe-webhook.js.
  const billing = await req(port, 'POST', '/api/billing/webhooks/stripe', { type: 'ping' });
  check('el webhook de Stripe no exige sesión (no es 401)',
    billing.status !== 401, `status=${billing.status}`);

  server.close();
  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
