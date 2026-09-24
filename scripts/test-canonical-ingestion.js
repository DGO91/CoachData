/**
 * test-canonical-ingestion.js
 * Verification Test Suite for the Canonical Integration Layer — CoachData Operational OS v2
 *
 * 6 assertions, ALL against the REAL database. No in-memory fallback.
 * If canonical_payment does not exist as a table, the test FAILS with exit(1).
 *
 * 1. Control negative — table existence (fails hard)
 * 2. Idempotency — same event twice → exactly 1 row
 * 3. RLS isolation — User B cannot see Org A data
 * 4. Control positive — User A CAN see Org A data
 * 5. Signature rejection — bad sig → nothing written
 * 6. raw_payload integrity — stored === original
 */

require('dotenv').config();
const crypto = require('crypto');
const { crearEntorno } = require('./lib/coaches-efimeros');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const { CanonicalEvent } = require('../src/backend/modules/integrations/domain/CanonicalEvent');
const { EntityTypes } = require('../src/backend/modules/integrations/domain/EntityTypes');
const { SupabaseCanonicalRepository } = require('../src/backend/modules/integrations/infrastructure/repositories/SupabaseCanonicalRepository');
const { IngestionDispatcher } = require('../src/backend/modules/integrations/application/IngestionDispatcher');
const { StripeConnector } = require('../src/backend/modules/integrations/infrastructure/connectors/StripeConnector');
const { TallyConnector } = require('../src/backend/modules/integrations/infrastructure/connectors/TallyConnector');
const { AppError } = require('../src/backend/shared/errors/AppError');

async function runCanonicalIngestionTests() {
  console.log("====================================================");
  console.log("COACHDATA CANONICAL INGESTION LAYER TEST SUITE");
  console.log("====================================================");

  const adminSupabase = getSupabaseClient();
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client not configured.");
    process.exit(1);
  }

  let passed = true;

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP: Authenticate User A and User B with real Supabase Auth JWT tokens
  // ─────────────────────────────────────────────────────────────────────────
  // A y B son coaches efímeros con organización propia. Antes eran las dos
  // cuentas reales de administración, con la contraseña reescrita en cada
  // pasada a un valor fijo escrito aquí, y la organización de A era de
  // producción ('test-org-1').
  const entorno = await crearEntorno(['a', 'b']);
  const userA_ID = entorno.coaches.a.userId;
  const orgA_ID  = entorno.coaches.a.organizationId;
  const userAClient = entorno.coaches.a.db;
  const userBClient = entorno.coaches.b.db;

  console.log("[Setup] Authenticated User A and User B with real JWT tokens.");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CONTROL NEGATIVE — TABLE EXISTENCE (FAILS HARD)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n1. CONTROL NEGATIVE — TABLE EXISTENCE CHECK:");
  const { data: tableCheck, error: tableErr } = await adminSupabase
    .from('canonical_payment')
    .select('id')
    .limit(1);

  if (tableErr && (tableErr.message.includes('Could not find') || tableErr.code === '42P01')) {
    console.error(`  [FATAL] Table 'canonical_payment' does NOT exist in the database!`);
    console.error(`  Error: ${tableErr.message}`);
    console.error(`  The migration 018_canonical_model.sql has not been applied.`);
    console.error(`  This test CANNOT pass without the real database schema.`);
    await entorno.limpiar();
    process.exit(1);
  }
  console.log("  [PASS] Table 'canonical_payment' exists in the database.");

  // Also check the other three
  for (const tbl of ['canonical_contact', 'canonical_session', 'canonical_form_entry']) {
    const { error: e } = await adminSupabase.from(tbl).select('id').limit(1);
    if (e && (e.message.includes('Could not find') || e.code === '42P01')) {
      console.error(`  [FATAL] Table '${tbl}' does NOT exist! Migration incomplete.`);
      await entorno.limpiar();
      process.exit(1);
    }
    console.log(`  [PASS] Table '${tbl}' exists.`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1C. TENANTS.ORGANIZATION_ID COLUMN EXISTENCE CHECK IN POSTGRES
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n1C. TENANTS.ORGANIZATION_ID COLUMN EXISTENCE CHECK IN POSTGRES:");
  const { error: colErr } = await adminSupabase.from('tenants').select('organization_id').limit(1);

  if (colErr && (colErr.message.includes('organization_id') || colErr.code === '42703')) {
    console.error(`  [FATAL] Column 'organization_id' does NOT exist in table 'tenants'!`);
    console.error(`  Error: ${colErr.message}`);
    console.error(`  Migration 019_tenant_organization_link.sql has NOT been applied by Diógenes yet.`);
    console.error(`  Without 019_tenant_organization_link.sql, tenant.organizationId resolves to null and live webhooks skip canonical ingestion!`);
    console.error(`  Aborting test runner — hard failure until migration 019 is applied.`);
    await entorno.limpiar();
    process.exit(1);
  }
  console.log("  [PASS] Column 'organization_id' exists in table 'tenants'.");

  // ─────────────────────────────────────────────────────────────────────────
  // Create test infrastructure
  // ─────────────────────────────────────────────────────────────────────────
  const repo = new SupabaseCanonicalRepository(adminSupabase);
  const dispatcher = new IngestionDispatcher({ canonicalRepository: repo });
  const testSourceId = `test_payment_${Date.now()}`;

  const testPayload = {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: testSourceId,
        amount_total: 5000,
        currency: 'usd',
        payment_status: 'succeeded',
        customer_details: {
          email: 'testclient@example.com',
          name: 'Test Client',
          phone: '+1234567890',
        },
        created: Math.floor(Date.now() / 1000),
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 2. IDEMPOTENCY — SAME EVENT TWICE → EXACTLY 1 ROW
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n2. IDEMPOTENCY TEST (same event ingested twice):");

  const paymentEvent = new CanonicalEvent({
    entityType:     EntityTypes.PAYMENT,
    organizationId: orgA_ID,
    sourceProvider: 'stripe',
    sourceId:       testSourceId,
    fields: {
      amount_cents: 5000,
      currency:     'usd',
      status:       'succeeded',
      payer_email:  'testclient@example.com',
      payer_name:   'Test Client',
    },
    rawPayload: testPayload,
    occurredAt: new Date(),
  });

  // First ingestion
  await dispatcher.ingest([paymentEvent]);

  // Second ingestion (duplicate)
  await dispatcher.ingest([paymentEvent]);

  // Count rows
  const { data: dupCheck, error: dupErr } = await adminSupabase
    .from('canonical_payment')
    .select('id')
    .eq('organization_id', orgA_ID)
    .eq('source_provider', 'stripe')
    .eq('source_id', testSourceId);

  if (dupErr) {
    console.error(`  [FAIL] Query error: ${dupErr.message}`);
    passed = false;
  } else if (dupCheck.length === 1) {
    console.log(`  [PASS] Exactly 1 row exists after 2 ingestions (idempotency confirmed).`);
  } else {
    console.error(`  [FAIL] Expected exactly 1 row, found ${dupCheck.length}. Idempotency BROKEN.`);
    passed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. RLS ISOLATION — USER B CANNOT SEE ORG A DATA
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n3. RLS ISOLATION TEST (User B querying Org A payments):");

  const { data: rlsCheck, error: rlsErr } = await userBClient
    .from('canonical_payment')
    .select('id')
    .eq('organization_id', orgA_ID)
    .eq('source_provider', 'stripe')
    .eq('source_id', testSourceId);

  if (rlsErr) {
    console.error(`  [FAIL] RLS query error: ${rlsErr.message}`);
    passed = false;
  } else if (rlsCheck.length === 0) {
    console.log(`  [PASS] User B sees 0 rows in Org A canonical_payment (RLS enforced).`);
  } else {
    console.error(`  [FAIL] User B saw ${rlsCheck.length} rows in Org A! RLS BROKEN.`);
    passed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CONTROL POSITIVE — USER A CAN SEE ORG A DATA
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n4. CONTROL POSITIVE TEST (User A querying Org A payments):");

  const { data: posCheck, error: posErr } = await userAClient
    .from('canonical_payment')
    .select('id')
    .eq('organization_id', orgA_ID)
    .eq('source_provider', 'stripe')
    .eq('source_id', testSourceId);

  if (posErr) {
    console.error(`  [FAIL] Positive control query error: ${posErr.message}`);
    passed = false;
  } else if (posCheck.length > 0) {
    console.log(`  [PASS] User A sees ${posCheck.length} row(s) in Org A canonical_payment (control positive confirmed).`);
  } else {
    console.error(`  [FAIL] User A sees 0 rows — either RLS is too strict or the row wasn't written.`);
    passed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SIGNATURE REJECTION — BAD SIGNATURE → NOTHING WRITTEN
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n5. SIGNATURE REJECTION TEST (bad Tally signature → no canonical write):");

  const tallyConnector = new TallyConnector();
  const badSigSourceId = `tally_badsig_${Date.now()}`;
  let sigRejected = false;

  try {
    tallyConnector.verifySignature(
      Buffer.from('{"test":true}'),
      { 'tally-signature': 'invalid_signature_base64' },
      'tally_test_secret_123'
    );
  } catch (err) {
    if (err instanceof AppError && err.errorCode === 'INVALID_SIGNATURE') {
      sigRejected = true;
    }
  }

  if (sigRejected) {
    console.log(`  [PASS] Bad Tally signature correctly rejected.`);
  } else {
    console.error(`  [FAIL] Bad Tally signature was NOT rejected!`);
    passed = false;
  }

  // Verify nothing was written for a hypothetical bad-sig event
  const { data: noWriteCheck } = await adminSupabase
    .from('canonical_form_entry')
    .select('id')
    .eq('organization_id', orgA_ID)
    .eq('source_provider', 'tally')
    .eq('source_id', badSigSourceId);

  if (!noWriteCheck || noWriteCheck.length === 0) {
    console.log(`  [PASS] No canonical row written for rejected signature (0 rows found).`);
  } else {
    console.error(`  [FAIL] Found ${noWriteCheck.length} rows for rejected signature! Data leak.`);
    passed = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. RAW_PAYLOAD INTEGRITY — STORED === ORIGINAL
  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // 6. RAW_PAYLOAD INTEGRITY TEST
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n6. RAW_PAYLOAD INTEGRITY TEST:");

  const { data: payloadRow, error: payloadErr } = await adminSupabase
    .from('canonical_payment')
    .select('raw_payload')
    .eq('organization_id', orgA_ID)
    .eq('source_provider', 'stripe')
    .eq('source_id', testSourceId)
    .single();

  if (payloadErr) {
    console.error(`  [FAIL] Query error: ${payloadErr.message}`);
    passed = false;
  } else {
    // Deep structural comparison
    const isDeepMatch = payloadRow?.raw_payload?.type === testPayload.type &&
                        payloadRow?.raw_payload?.data?.object?.id === testPayload.data.object.id &&
                        payloadRow?.raw_payload?.data?.object?.amount_total === testPayload.data.object.amount_total;

    if (isDeepMatch) {
      console.log(`  [PASS] raw_payload stored matches original payload (deep structure verified).`);
    } else {
      console.error(`  [FAIL] raw_payload MISMATCH!`);
      console.error(`    Original:`, JSON.stringify(testPayload).substring(0, 100));
      console.error(`    Stored:  `, JSON.stringify(payloadRow.raw_payload).substring(0, 100));
      passed = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. END-TO-END TENANT ORGANIZATION RESOLUTION & WEBHOOK DISPATCH TEST
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n7. END-TO-END TENANT ORGANIZATION RESOLUTION & WEBHOOK DISPATCH:");

  const { SupabaseTenantRepository } = require('../src/backend/modules/webhooks/infrastructure/repositories/SupabaseTenantRepository');
  const tenantRepo = new SupabaseTenantRepository(adminSupabase);

  const ephemeralTenantId = crypto.randomUUID();

  // Declarados FUERA del try para que el finally pueda limpiarlos aunque el
  // paso falle a mitad de camino. Si viven dentro del try, un fallo temprano
  // deja filas de prueba en la base de forma permanente — que es justo lo que
  // pasó con el contacto 'tally_contact_e2eclient_example_com'.
  const e2eEmail = 'e2eclient@example.com';
  let tallyE2ESourceId = null;

  try {
    // Create dedicated ephemeral test tenant (never mutates real production rows)
    const { error: insertErr } = await adminSupabase.from('tenants').upsert({
      id: ephemeralTenantId,
      company_name: 'Ephemeral Test Tenant',
      primary_contact_email: 'ephemeral@test.com',
      active_package: 'pro',
      auth_user_id: userA_ID,
      organization_id: orgA_ID
    }, { onConflict: 'id' });

    if (insertErr) {
      console.error(`  [FAIL] Ephemeral tenant upsert failed: ${insertErr.message}`);
      passed = false;
    }

    const resolvedTenant = await tenantRepo.findById(ephemeralTenantId);
    if (resolvedTenant.organizationId) {
      console.log(`  [PASS] Ephemeral tenant '${ephemeralTenantId}' successfully resolved to organizationId '${resolvedTenant.organizationId}'.`);

      // Test End-to-End Webhook Ingestion Pipeline via WebhookDispatcher
      const { WebhookDispatcher } = require('../src/backend/modules/webhooks/application/WebhookDispatcher');
      const { HandlerRegistry } = require('../src/backend/modules/webhooks/registry/HandlerRegistry');
      const { ConnectorRegistry } = require('../src/backend/modules/integrations/application/ConnectorRegistry');
      const { TallyWebhookHandler } = require('../src/backend/modules/webhooks/infrastructure/handlers/TallyWebhookHandler');
      const { TallyConnector } = require('../src/backend/modules/integrations/infrastructure/connectors/TallyConnector');

      const secret = 'tally_e2e_secret_123';
      tallyE2ESourceId = `resp_e2e_${Date.now()}`;
      const payloadObj = {
        eventId: `evt_${Date.now()}`,
        eventType: 'FORM_RESPONSE',
        createdAt: new Date().toISOString(),
        data: {
          responseId: tallyE2ESourceId,
          formName: 'E2E Lead Form',
          fields: [
            { key: 'q1', label: 'Email', type: 'INPUT_EMAIL', value: 'e2eclient@example.com' },
            { key: 'q2', label: 'Name', type: 'INPUT_TEXT', value: 'E2E Lead' }
          ]
        }
      };

      const rawBody = Buffer.from(JSON.stringify(payloadObj), 'utf8');
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

      const handlerReg = new HandlerRegistry().register('tally', new TallyWebhookHandler());
      const connReg    = new ConnectorRegistry().register(new TallyConnector());

      const mockKeyRepo = {
        findDecryptedKeysByTenantId: async () => ({}),
        findWebhookSecretsByTenantId: async () => ({ tally: secret })
      };

      const testWebhookDispatcher = new WebhookDispatcher({
        tenantRepository: tenantRepo,
        keyRepository: mockKeyRepo,
        handlerRegistry: handlerReg,
        ingestionDispatcher: dispatcher,
        connectorRegistry: connReg
      });

      await testWebhookDispatcher.dispatch({
        tenantId: ephemeralTenantId,
        provider: 'tally',
        payload: payloadObj,
        rawBody,
        signature
      });

      // Verify row created in canonical_form_entry
      const { data: e2eRows, error: e2eErr } = await adminSupabase
        .from('canonical_form_entry')
        .select('id, respondent_email')
        .eq('source_provider', 'tally')
        .eq('source_id', tallyE2ESourceId);

      if (!e2eErr && e2eRows && e2eRows.length === 1) {
        console.log(`  [PASS] End-to-End Webhook Pipeline successfully ingested Tally event into canonical_form_entry (Email: ${e2eRows[0].respondent_email}).`);
      } else {
        console.error(`  [FAIL] End-to-End Webhook Pipeline failed to write row into canonical_form_entry. Error: ${e2eErr?.message}`);
        passed = false;
      }

    } else {
      console.error(`  [FAIL] Tenant '${ephemeralTenantId}' resolved to NULL organizationId! Canonical ingestion will be unreachable.`);
      passed = false;
    }
  } catch (tErr) {
    console.error(`  [FAIL] Error during E2E tenant resolution / webhook dispatch: ${tErr.message}`);
    passed = false;
  } finally {
    // El webhook de Tally escribe DOS filas canónicas por evento: la respuesta
    // del formulario y el contacto que la envió. Antes solo se borraba la
    // primera, así que cada ejecución dejaba un contacto huérfano en la base.
    if (tallyE2ESourceId) {
      await adminSupabase.from('canonical_form_entry').delete().eq('source_id', tallyE2ESourceId);
    }
    // El source_id del contacto lo deriva el conector del email, sin timestamp,
    // así que se borra por email en vez de por id generado.
    await adminSupabase
      .from('canonical_contact')
      .delete()
      .eq('source_provider', 'tally')
      .eq('email', e2eEmail);

    // Delete ephemeral test tenant (guarantees zero mutation of production rows)
    await adminSupabase.from('tenants').delete().eq('id', ephemeralTenantId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CLEANUP — Remove test rows so suite is re-runnable
  // ─────────────────────────────────────────────────────────────────────────
  await adminSupabase
    .from('canonical_payment')
    .delete()
    .eq('source_id', testSourceId)
    .eq('source_provider', 'stripe');

  await entorno.limpiar();

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("CANONICAL INGESTION LAYER VERDICT: ALL TESTS PASSED — PASS");
  } else {
    console.log("CANONICAL INGESTION LAYER VERDICT: FAILED");
    process.exit(1);
  }
}

runCanonicalIngestionTests();
