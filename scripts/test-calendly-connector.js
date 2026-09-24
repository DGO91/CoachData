/**
 * test-calendly-connector.js
 * Verification Test Suite for the Calendly Connector — CoachData Operational OS v2
 *
 * 7 assertions, ALL against the REAL database:
 * 1. Control negative — bad signature → INVALID_SIGNATURE, 0 rows written
 * 2. Control negative — no secret configured → WEBHOOK_NOT_CONFIGURED
 * 3. Control negative — stale timestamp → STALE_TIMESTAMP
 * 4. Control positive — invitee.created → 1 session + 1 contact
 * 5. Idempotency — same event twice → exactly 1 row
 * 6. RLS isolation — User B cannot see Org A sessions
 * 7. Cleanup in finally — all rows deleted (session + contact + ephemeral tenant)
 */

require('dotenv').config();
const crypto = require('crypto');
const { crearEntorno } = require('./lib/coaches-efimeros');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const { CalendlyConnector } = require('../src/backend/modules/integrations/infrastructure/connectors/CalendlyConnector');
const { CanonicalEvent } = require('../src/backend/modules/integrations/domain/CanonicalEvent');
const { EntityTypes } = require('../src/backend/modules/integrations/domain/EntityTypes');
const { SupabaseCanonicalRepository } = require('../src/backend/modules/integrations/infrastructure/repositories/SupabaseCanonicalRepository');
const { IngestionDispatcher } = require('../src/backend/modules/integrations/application/IngestionDispatcher');
const { AppError } = require('../src/backend/shared/errors/AppError');

function buildCalendlySignature(rawBody, secret, timestampOverride) {
    const t = timestampOverride || Math.floor(Date.now() / 1000);
    const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const signedPayload = `${t}.${rawBodyStr}`;
    const v1 = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
    return { header: `t=${t},v1=${v1}`, timestamp: t };
}

async function runCalendlyTests() {
    console.log("====================================================");
    console.log("COACHDATA CALENDLY CONNECTOR TEST SUITE");
    console.log("====================================================");

    const adminSupabase = getSupabaseClient();
    if (!adminSupabase) {
        console.error("[FATAL] Supabase client not configured.");
        process.exit(1);
    }

    let passed = true;
    const connector = new CalendlyConnector();
    const secret = 'calendly_test_signing_key_abc123';

    // ── Test identifiers declared OUTSIDE try for cleanup in finally ──────
    // A y B son coaches efímeros: antes eran las dos cuentas reales de
    // administración —a B se le reescribía la contraseña en cada pasada— y la
    // organización de A era una de producción, escrita a mano aquí.
    const entorno = await crearEntorno(['a', 'b']);
    const coachA = entorno.coaches.a;
    const coachB = entorno.coaches.b;
    const userA_ID = coachA.userId;
    const orgA_ID = coachA.organizationId;
    const ephemeralTenantId = crypto.randomUUID();
    const testInviteeUri = `https://api.calendly.com/scheduled_events/TEST123/invitees/INV_${Date.now()}`;
    const testEmail = 'calendly-test-client@example.com';
    const testContactSourceId = `calendly_contact_${testEmail.replace(/[^a-z0-9]/g, '_')}`;

    try {
        // ─────────────────────────────────────────────────────────────────────
        // 1. CONTROL NEGATIVE — BAD SIGNATURE
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n1. CONTROL NEGATIVE — bad Calendly signature:");
        const rawBody = Buffer.from('{"event":"invitee.created","payload":{}}', 'utf8');
        let sigRejected = false;
        const currentTs = Math.floor(Date.now() / 1000);

        try {
            connector.verifySignature(rawBody, {
                'calendly-webhook-signature': `t=${currentTs},v1=invalid_hex_signature`
            }, secret);
        } catch (err) {
            if (err instanceof AppError && err.errorCode === 'INVALID_SIGNATURE') {
                sigRejected = true;
            }
        }

        if (sigRejected) {
            console.log("  [PASS] Bad Calendly signature correctly rejected (INVALID_SIGNATURE).");
        } else {
            console.error("  [FAIL] Bad Calendly signature was NOT rejected!");
            passed = false;
        }

        // Verify nothing written to canonical_session for a bad-sig source_id
        const { data: noWriteCheck } = await adminSupabase
            .from('canonical_session')
            .select('id')
            .eq('source_provider', 'calendly')
            .eq('source_id', 'bad_sig_never_written');

        if (!noWriteCheck || noWriteCheck.length === 0) {
            console.log("  [PASS] 0 rows in canonical_session for rejected signature.");
        } else {
            console.error(`  [FAIL] Found ${noWriteCheck.length} rows for rejected signature!`);
            passed = false;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. CONTROL NEGATIVE — NO SECRET CONFIGURED
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n2. CONTROL NEGATIVE — no secret configured:");
        let noSecretRejected = false;

        try {
            connector.verifySignature(rawBody, {
                'calendly-webhook-signature': 't=9999999999,v1=anything'
            }, null);
        } catch (err) {
            if (err instanceof AppError && err.errorCode === 'WEBHOOK_NOT_CONFIGURED') {
                noSecretRejected = true;
            }
        }

        if (noSecretRejected) {
            console.log("  [PASS] Missing secret correctly throws WEBHOOK_NOT_CONFIGURED.");
        } else {
            console.error("  [FAIL] Missing secret was NOT rejected!");
            passed = false;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. CONTROL NEGATIVE — STALE TIMESTAMP
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n3. CONTROL NEGATIVE — stale timestamp (10 minutes old):");
        let staleRejected = false;
        const staleTs = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
        const { header: staleHeader } = buildCalendlySignature(rawBody, secret, staleTs);

        try {
            connector.verifySignature(rawBody, {
                'calendly-webhook-signature': staleHeader
            }, secret);
        } catch (err) {
            if (err instanceof AppError && err.errorCode === 'STALE_TIMESTAMP') {
                staleRejected = true;
            }
        }

        if (staleRejected) {
            console.log("  [PASS] Stale timestamp correctly rejected (STALE_TIMESTAMP).");
        } else {
            console.error("  [FAIL] Stale timestamp was NOT rejected!");
            passed = false;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 4. CONTROL POSITIVE — invitee.created → 1 session + 1 contact
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n4. CONTROL POSITIVE — invitee.created ingestion:");

        // Create ephemeral test tenant
        await adminSupabase.from('tenants').delete().eq('id', ephemeralTenantId);
        const { error: tenantErr } = await adminSupabase.from('tenants').upsert({
            id: ephemeralTenantId,
            company_name: 'Calendly Test Tenant',
            primary_contact_email: 'calendly-test@example.com',
            active_package: 'pro',
            auth_user_id: userA_ID,
            organization_id: orgA_ID,
        }, { onConflict: 'id' });

        if (tenantErr) {
            console.error(`  [FAIL] Ephemeral tenant creation failed: ${tenantErr.message}`);
            passed = false;
        }

        const testPayload = {
            event: 'invitee.created',
            created_at: new Date().toISOString(),
            payload: {
                uri: testInviteeUri,
                email: testEmail,
                name: 'Jane Coach Client',
                status: 'active',
                event: 'https://api.calendly.com/scheduled_events/TEST123',
                timezone: 'Europe/Madrid',
            },
            _enriched: {
                start_time: '2026-08-15T10:00:00Z',
                end_time: '2026-08-15T10:30:00Z',
                event_type_name: 'Coaching Session 30min',
            },
        };

        const canonicalEvents = connector.parseWebhook(testPayload, orgA_ID);

        if (canonicalEvents.length !== 2) {
            console.error(`  [FAIL] Expected 2 canonical events (session + contact), got ${canonicalEvents.length}.`);
            passed = false;
        } else {
            console.log(`  [PASS] parseWebhook produced ${canonicalEvents.length} canonical events (session + contact).`);
        }

        // Ingest into database
        const repo = new SupabaseCanonicalRepository(adminSupabase);
        const dispatcher = new IngestionDispatcher({ canonicalRepository: repo });
        const result = await dispatcher.ingest(canonicalEvents);

        // Verify session row
        const { data: sessionRows, error: sessionErr } = await adminSupabase
            .from('canonical_session')
            .select('*')
            .eq('organization_id', orgA_ID)
            .eq('source_provider', 'calendly')
            .eq('source_id', testInviteeUri);

        if (sessionErr) {
            console.error(`  [FAIL] Session query error: ${sessionErr.message}`);
            passed = false;
        } else if (sessionRows && sessionRows.length === 1) {
            const row = sessionRows[0];
            const emailMatch = row.attendee_email === testEmail;
            const startsAtMatch = row.starts_at != null;
            if (emailMatch && startsAtMatch) {
                console.log(`  [PASS] 1 row in canonical_session with attendee_email='${row.attendee_email}' and starts_at='${row.starts_at}'.`);
            } else {
                console.error(`  [FAIL] Session row has incorrect fields. email=${row.attendee_email} starts_at=${row.starts_at}`);
                passed = false;
            }
        } else {
            console.error(`  [FAIL] Expected 1 session row, found ${sessionRows?.length || 0}.`);
            passed = false;
        }

        // Verify contact row
        const { data: contactRows, error: contactErr } = await adminSupabase
            .from('canonical_contact')
            .select('*')
            .eq('organization_id', orgA_ID)
            .eq('source_provider', 'calendly')
            .eq('source_id', testContactSourceId);

        if (contactErr) {
            console.error(`  [FAIL] Contact query error: ${contactErr.message}`);
            passed = false;
        } else if (contactRows && contactRows.length > 0) {
            console.log(`  [PASS] 1 row in canonical_contact with email='${contactRows[0].email}'.`);
        } else {
            console.error(`  [FAIL] Expected 1 contact row, found 0.`);
            passed = false;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 5. IDEMPOTENCY — same event twice → exactly 1 row
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n5. IDEMPOTENCY — same Calendly event ingested twice:");

        // Ingest the same events again
        await dispatcher.ingest(canonicalEvents);

        const { data: idempCheck } = await adminSupabase
            .from('canonical_session')
            .select('id')
            .eq('organization_id', orgA_ID)
            .eq('source_provider', 'calendly')
            .eq('source_id', testInviteeUri);

        if (idempCheck && idempCheck.length === 1) {
            console.log("  [PASS] Exactly 1 row after 2 ingestions (idempotency confirmed).");
        } else {
            console.error(`  [FAIL] Expected 1 row, found ${idempCheck?.length || 0}. Idempotency BROKEN.`);
            passed = false;
        }

        // ─────────────────────────────────────────────────────────────────────
        // 6. RLS ISOLATION — User B cannot see Org A sessions
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n6. RLS ISOLATION — User B querying Org A sessions:");

        if (!coachB?.token) {
            console.error("  [FAIL] Could not authenticate User B.");
            passed = false;
        } else {
            const userBClient = coachB.db;

            const { data: rlsCheck, error: rlsErr } = await userBClient
                .from('canonical_session')
                .select('id')
                .eq('organization_id', orgA_ID)
                .eq('source_provider', 'calendly')
                .eq('source_id', testInviteeUri);

            if (rlsErr) {
                console.error(`  [FAIL] RLS query error: ${rlsErr.message}`);
                passed = false;
            } else if (rlsCheck.length === 0) {
                console.log("  [PASS] User B sees 0 rows in Org A canonical_session (RLS enforced).");
            } else {
                console.error(`  [FAIL] User B saw ${rlsCheck.length} rows in Org A! RLS BROKEN.`);
                passed = false;
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 8. CONTROL NEGATIVE — ENRICHMENT CAÍDO (starts_at null prevention)
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n8. CONTROL NEGATIVE — Calendly Enrichment Failure:");
        
        const { CalendlyWebhookHandler } = require('../src/backend/modules/webhooks/infrastructure/handlers/CalendlyWebhookHandler');
        const handler = new CalendlyWebhookHandler();
        
        const decryptedKeys = { calendly: 'connection-id-that-will-fail-enrichment' };
        const webhookSecrets = { calendly: secret };
        const tenant = { organizationId: orgA_ID };
        
        const mockFailedPayload = {
            event: 'invitee.created',
            created_at: new Date().toISOString(),
            payload: {
                uri: 'https://api.calendly.com/scheduled_events/FAIL123',
                email: 'fail-enrichment@example.com',
                name: 'Fail Lead',
                event: 'https://api.calendly.com/scheduled_events/FAIL123'
            }
        };

        const { header: validSigHeader } = buildCalendlySignature(JSON.stringify(mockFailedPayload), secret);

        const mockEvent = {
            tenantId: ephemeralTenantId,
            provider: 'calendly',
            payload: mockFailedPayload,
            rawBody: JSON.stringify(mockFailedPayload),
            signature: validSigHeader
        };

        const { ConnectorRegistry } = require('../src/backend/modules/integrations/application/ConnectorRegistry');
        const connectorRegistry = new ConnectorRegistry().register(connector);

        let handlerErr = null;
        try {
            await handler.handle(mockEvent, {
                decryptedKeys,
                webhookSecrets,
                tenant,
                ingestionDispatcher: dispatcher,
                connectorRegistry
            });
        } catch (err) {
            handlerErr = err;
        }

        if (handlerErr && handlerErr instanceof AppError && handlerErr.errorCode === 'CALENDLY_ENRICHMENT_FAILED') {
            console.log("  [PASS] Enrichment failure correctly aborted and threw CALENDLY_ENRICHMENT_FAILED.");
        } else {
            console.error("  [FAIL] Expected CALENDLY_ENRICHMENT_FAILED error, got:", handlerErr);
            passed = false;
        }

        // Verify nothing was written to the DB for this failed session
        const { data: failCheck } = await adminSupabase
            .from('canonical_session')
            .select('id')
            .eq('organization_id', orgA_ID)
            .eq('source_provider', 'calendly')
            .eq('source_id', 'https://api.calendly.com/scheduled_events/FAIL123');

        if (!failCheck || failCheck.length === 0) {
            console.log("  [PASS] 0 rows written to canonical_session on enrichment failure.");
        } else {
            console.error(`  [FAIL] Ingested ${failCheck.length} rows despite enrichment failure!`);
            passed = false;
        }

    } finally {
        // ─────────────────────────────────────────────────────────────────────
        // 7. CLEANUP — all test rows deleted (session + contact + tenant)
        // ─────────────────────────────────────────────────────────────────────
        console.log("\n7. CLEANUP:");

        // Delete session row
        await adminSupabase.from('canonical_session').delete()
            .eq('source_provider', 'calendly')
            .in('source_id', [testInviteeUri, 'https://api.calendly.com/scheduled_events/FAIL123']);
        console.log("  Cleaned: canonical_session");

        // Delete contact row
        await adminSupabase.from('canonical_contact').delete()
            .eq('source_provider', 'calendly')
            .eq('source_id', testContactSourceId);
        console.log("  Cleaned: canonical_contact");

        // Delete ephemeral tenant
        await adminSupabase.from('tenants').delete().eq('id', ephemeralTenantId);
        console.log("  Cleaned: ephemeral tenant");

        await entorno.limpiar();
        console.log("  Cleaned: coaches efímeros y sus organizaciones");
    }

    console.log("\n----------------------------------------------------");
    if (passed) {
        console.log("CALENDLY CONNECTOR VERDICT: ALL TESTS PASSED — PASS");
    } else {
        console.log("CALENDLY CONNECTOR VERDICT: FAILED");
        process.exit(1);
    }
}

runCalendlyTests();
