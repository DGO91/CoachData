require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const { OutboundWebhookDispatcher } = require('../../src/backend/modules/integrations/application/OutboundWebhookDispatcher');
const { CanonicalEvent } = require('../../src/backend/modules/integrations/domain/CanonicalEvent');
const { EntityTypes } = require('../../src/backend/modules/integrations/domain/EntityTypes');

const ORG_ID = '00000000-0000-0000-0000-000000000001';

let failures = 0;
function check(condition, message, detail) {
  if (condition) {
    console.log(`PASS: ${message}`);
  } else {
    failures++;
    console.error(`FAIL: ${message}`, detail ?? '');
  }
}

// Cliente de Supabase mínimo: solo lo que el dispatcher lee de organizations.
function fakeSupabase(webhooks) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: { settings_json: { outbound_webhooks: webhooks } } }),
  };
  return { from: () => query };
}

function hmac(secret, body) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

async function runTests() {
  console.log('=== RUNNING OUTBOUND WEBHOOK DISPATCHER TESTS ===\n');

  // Receptor local: guarda cada petición por ruta.
  const received = {};
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      received[req.url] = { body, signature: req.headers['x-coachdata-signature'] };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"success":true}');
    });
  });
  await new Promise(resolve => server.listen(0, resolve));
  const base = `http://localhost:${server.address().port}`;

  const testEvent = new CanonicalEvent({
    entityType: EntityTypes.PAYMENT,
    organizationId: ORG_ID,
    sourceProvider: 'stripe',
    sourceId: 'pi_test_123',
    fields: { amount_cents: 15000, currency: 'eur', status: 'succeeded' },
    rawPayload: { id: 'pi_test_123' },
    occurredAt: new Date(),
  });

  try {
    // TEST 1: la firma es el HMAC del cuerpo con el secreto dado, no solo un prefijo.
    const secret = OutboundWebhookDispatcher.generateSecret();
    await new OutboundWebhookDispatcher().dispatchEvent(ORG_ID, testEvent, `${base}/custom`, secret);
    const r1 = received['/custom'];
    check(r1 && JSON.parse(r1.body).event_type === 'canonical.payment', 'el evento llega al receptor', r1);
    check(r1 && r1.signature === hmac(secret, r1.body), 'la firma se verifica con el secreto del webhook', r1?.signature);
    check(r1 && r1.signature !== hmac('coachdata_default_secret', r1.body), 'la firma no usa el secreto común antiguo');

    // TEST 2: customTargetUrl sin secreto se rechaza.
    let threw = false;
    try {
      await new OutboundWebhookDispatcher().dispatchEvent(ORG_ID, testEvent, `${base}/sin-secreto-custom`);
    } catch {
      threw = true;
    }
    check(threw && !received['/sin-secreto-custom'], 'customTargetUrl sin secreto lanza error y no envía');

    // TEST 3: de los webhooks de la organización, el que no tiene secreto no se envía,
    // y dos secretos distintos producen firmas distintas.
    const secretA = OutboundWebhookDispatcher.generateSecret();
    const secretB = OutboundWebhookDispatcher.generateSecret();
    const dispatcher = new OutboundWebhookDispatcher({
      supabaseClient: fakeSupabase([
        { active: true, url: `${base}/a`, secret: secretA },
        { active: true, url: `${base}/b`, secret: secretB },
        { active: true, url: `${base}/sin-secreto` },
      ]),
    });
    await dispatcher.dispatchEvent(ORG_ID, testEvent);
    check(!received['/sin-secreto'], 'el webhook sin secreto no se envía');
    check(received['/a'] && received['/a'].signature === hmac(secretA, received['/a'].body), 'webhook A firmado con su secreto');
    check(received['/b'] && received['/b'].signature === hmac(secretB, received['/b'].body), 'webhook B firmado con su secreto');
    check(received['/a'] && received['/b'] && received['/a'].signature !== received['/b'].signature, 'secretos distintos dan firmas distintas');
  } finally {
    server.close();
  }

  if (failures > 0) {
    console.error(`\n=== ${failures} FALLO(S) ===`);
    process.exit(1);
  }
  console.log('\n=== OUTBOUND WEBHOOK DISPATCHER TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
