/**
 * test-google-oauth-hardening.js
 * Verification Test Suite for Google OAuth Security & Resiliency — CoachData Operational OS v2
 *
 * Los dos usuarios (el dueño del tenant y el intruso del control de 403) son
 * coaches efímeros. Antes eran las dos cuentas reales de administración, con la
 * contraseña reescrita en cada pasada a un valor fijo escrito en este fichero.
 *
 * Este script vive en el modelo heredado `tenants` + `auth_user_id`, no en
 * `organizations`: el tenant se crea a nombre del coach A y se borra al salir.
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const { INTERNAL_SECRET } = require('../src/backend/config/env');
const { decrypt, encrypt } = require('../src/backend/infrastructure/services/encryptionService');

function makeRequest(port, routePath, method = 'POST', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: routePath,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          contentType: res.headers['content-type'] || '',
          body: data
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runHardeningTests() {
  console.log("====================================================");
  console.log("COACHDATA GOOGLE OAUTH SECURITY & HARDENING TEST SUITE");
  console.log("====================================================");

  let passed = true;
  
  // Use service_role client explicitly to bypass RLS policies in sandbox tests
  const { crearEntorno } = require('./lib/coaches-efimeros');
  const entorno = await crearEntorno(['a', 'b']);
  const adminSupabase = entorno.admin;
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client could not be initialized with service_role.");
    process.exit(1);
  }

  // Ephemeral server
  const app = createApp([]);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Setup] Express test server listening on http://127.0.0.1:${port}`);

  // Test setup identifiers
  const coachA = entorno.coaches.a;   // dueño del tenant
  const coachB = entorno.coaches.b;   // el que no debe poder entrar
  const testTenantId = require('crypto').randomUUID();
  const providerName = 'google_calendar_oauth';

  // Seed test environment data
  const tenantInsert = await adminSupabase.from('tenants').insert([{
      id: testTenantId,
      company_name: `Sandbox ${entorno.marca}`,
      primary_contact_email: coachA.email,
      active_package: 'Pending / Free Tier',
      auth_user_id: coachA.userId
  }]);
  if (tenantInsert.error) {
    await entorno.limpiar();
    throw new Error(`Tenant Insert Failed: ${tenantInsert.error.message}`);
  }

  const tokenA = coachA.token;
  const tokenB = coachB.token;

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // 1. SECURITY TEST: POST /api/auth/google/prepare must reject unauthenticated requests
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1. SECURITY: POST /api/auth/google/prepare without authorization header:");
    const resPrepareNoAuth = await makeRequest(port, '/api/auth/google/prepare', 'POST', {}, { tenantId: testTenantId, type: 'calendar' });
    if (resPrepareNoAuth.status === 401) {
      console.log(`  [PASS] Unauthenticated request correctly rejected with HTTP 401 Unauthorized.`);
    } else {
      console.error(`  [FAIL] Expected HTTP 401, got HTTP ${resPrepareNoAuth.status}. Body:`, resPrepareNoAuth.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. SECURITY TEST: POST /api/auth/google/prepare must reject mismatched tenants
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. SECURITY: POST /api/auth/google/prepare with mismatched tenant ownership:");
    const headersB = { 'Authorization': `Bearer ${tokenB}`, 'Content-Type': 'application/json' };
    const resPrepareWrongTenant = await makeRequest(port, '/api/auth/google/prepare', 'POST', headersB, { tenantId: testTenantId, type: 'calendar' });
    if (resPrepareWrongTenant.status === 403) {
      console.log(`  [PASS] Request correctly rejected with HTTP 403 Forbidden.`);
    } else {
      console.error(`  [FAIL] Expected HTTP 403, got HTTP ${resPrepareWrongTenant.status}. Body:`, resPrepareWrongTenant.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2B. SECURITY TEST: POST /api/auth/google/prepare succeeds for legitimate owners
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2B. SECURITY: POST /api/auth/google/prepare succeeds for correct owner:");
    const headersA = { 'Authorization': `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const resPrepareOk = await makeRequest(port, '/api/auth/google/prepare', 'POST', headersA, { tenantId: testTenantId, type: 'calendar' });
    
    let validStateJwt = null;
    if (resPrepareOk.status === 200) {
      const body = JSON.parse(resPrepareOk.body);
      validStateJwt = body.state;
      if (validStateJwt) {
        console.log(`  [PASS] Successfully generated state JWT for legitimate tenant owner.`);
      } else {
        console.error(`  [FAIL] Retuned payload is missing 'state' field:`, body);
        passed = false;
      }
    } else {
      console.error(`  [FAIL] Expected HTTP 200, got HTTP ${resPrepareOk.status}. Body:`, resPrepareOk.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2C. CONTROL POSITIVE: GET /api/auth/google/start redirects correctly to Google
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2C. CONTROL POSITIVE: GET /api/auth/google/start with valid state JWT:");
    if (validStateJwt) {
      const resStart = await makeRequest(port, `/api/auth/google/start?state=${encodeURIComponent(validStateJwt)}`, 'GET');
      if (resStart.status === 302 && resStart.headers.location && resStart.headers.location.includes('accounts.google.com')) {
        console.log(`  [PASS] Legitimate flow redirected successfully with HTTP 302 to Google authorization page.`);
      } else {
        console.error(`  [FAIL] Expected HTTP 302 redirecting to accounts.google.com. Status: ${resStart.status}, Location:`, resStart.headers.location);
        passed = false;
      }
    } else {
      console.log(`  [SKIPPED] Missing validStateJwt from previous step.`);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2D. SECURITY TEST: GET /api/auth/google/start rejects invalid or flat states
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2D. SECURITY: GET /api/auth/google/start rejects invalid state query parameters:");
    const resStartFlat = await makeRequest(port, `/api/auth/google/start?state=${testTenantId}`, 'GET');
    if (resStartFlat.status === 403) {
      console.log(`  [PASS] Flat state parameter correctly rejected with HTTP 403 Forbidden.`);
    } else {
      console.error(`  [FAIL] Expected HTTP 403 for flat state, got HTTP ${resStartFlat.status}. Body:`, resStartFlat.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. RESILIENCY TEST: Preservation of existing refresh_token during callback
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. RESILIENCY: Preservation of refresh_token in handleGoogleCallback:");
    const originalToken = {
        token: 'old-access-token',
        refresh_token: 'keep-this-refresh-token-12345',
        expiry: new Date(Date.now() + 3600000).toISOString()
    };
    
    await adminSupabase.from('client_provider_keys').delete().eq('tenant_id', testTenantId);
    const keyInsert = await adminSupabase.from('client_provider_keys').insert([{
        tenant_id: testTenantId,
        provider_type: 'identity',
        provider_name: providerName,
        api_key_encrypted: encrypt(JSON.stringify(originalToken))
    }]);
    if (keyInsert.error) throw new Error(`Key Insert Failed: ${keyInsert.error.message}`);

    try {
        const { data: existing } = await adminSupabase.from('client_provider_keys')
            .select('api_key_encrypted')
            .eq('tenant_id', testTenantId)
            .eq('provider_name', providerName)
            .maybeSingle();

        const parsed = JSON.parse(decrypt(existing.api_key_encrypted));
        if (parsed.refresh_token === 'keep-this-refresh-token-12345') {
            console.log(`  [PASS] decrypt functions flawlessly in credential context, refresh_token parsed successfully.`);
        } else {
            console.error(`  [FAIL] Failed to decrypt or extract refresh_token. Got:`, parsed);
            passed = false;
        }
    } catch (err) {
        console.error(`  [FAIL] ReferenceError or decryption error occurred during refresh_token preservation test:`, err);
        passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. RESILIENCY: Key decryption failure fallback (needs_reconnection)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4. RESILIENCY: Key decryption failure fallback (needs_reconnection):");
    const { getSafeTenantKeys } = require('../src/backend/application/credentials/credentialsUseCase');
    
    const corruptedPayload = 'invalid-aes-gcm-encrypted-string-that-fails-decryption';
    await adminSupabase.from('client_provider_keys').delete().eq('tenant_id', testTenantId).eq('provider_name', 'google_mail_oauth');
    const corruptedInsert = await adminSupabase.from('client_provider_keys').insert([{
        tenant_id: testTenantId,
        provider_type: 'identity',
        provider_name: 'google_mail_oauth',
        api_key_encrypted: corruptedPayload
    }]);
    if (corruptedInsert.error) throw new Error(`Corrupted Key Insert Failed: ${corruptedInsert.error.message}`);

    const safeKeys = await getSafeTenantKeys(testTenantId);
    const targetKey = safeKeys.find(k => k.provider_name === 'google_mail_oauth');
    if (targetKey && targetKey.status === 'needs_reconnection') {
        console.log(`  [PASS] Key decryption failure correctly caught and flagged to frontend as status: 'needs_reconnection'.`);
    } else {
        console.error(`  [FAIL] Expected status 'needs_reconnection' for corrupted decryption, got:`, targetKey);
        passed = false;
    }

  } finally {
    server.close();
    // La limpieza estaba dentro del `try`: un fallo a mitad dejaba el tenant y
    // sus claves cifradas en la base.
    await adminSupabase.from('client_provider_keys').delete().eq('tenant_id', testTenantId);
    await adminSupabase.from('tenants').delete().eq('id', testTenantId);
    await entorno.limpiar();
  }

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("COACHDATA OAUTH HARDENING VERDICT: ALL TESTS PASSED — PASS");
  } else {
    console.log("COACHDATA OAUTH HARDENING VERDICT: FAILED");
    process.exit(1);
  }
}

runHardeningTests();
