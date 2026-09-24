/**
 * test-waitlist-engine.js
 * Verification Test Suite for Public Waitlist Engine & Admin Management — CoachData Operational OS v2
 *
 * El administrador que consulta /api/admin/waitlist es un coach efímero. Antes
 * este script reescribía la contraseña de una cuenta real a un valor fijo
 * escrito aquí mismo, y dependía de un UUID y un slug a mano.
 */

require('dotenv').config();
const http = require('http');
const { crearEntorno } = require('./lib/coaches-efimeros');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const { devMemoryWaitlist } = require('../src/backend/infrastructure/web/routes/publicWaitlistRoutes');

function makeRequest(port, routePath, method = 'GET', headers = {}, body = null) {
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
        const bodyTrim = data.trim();
        const isHtml = bodyTrim.startsWith('<!DOCTYPE') || bodyTrim.startsWith('<!doctype') || bodyTrim.startsWith('<html');
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'] || '',
          isSpaHtml: isHtml,
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

async function runWaitlistTests() {
  console.log("====================================================");
  console.log("COACHDATA SPRINT 26.1 PUBLIC WAITLIST & ADMIN TEST SUITE");
  console.log("====================================================");

  let passed = true;
  const adminSupabase = getSupabaseClient();
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client not configured.");
    process.exit(1);
  }

  // 1. Coach efímero con su propia organización: de ahí salen el JWT y el slug.
  const entorno = await crearEntorno(['a']);
  const { token: validJwt, slug: orgA_Slug } = entorno.coaches.a;
  if (!validJwt) {
    console.error("[FATAL] Could not obtain valid Auth JWT token.");
    await entorno.limpiar();
    process.exit(1);
  }

  const app = createApp([]);
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`[Server] Live test server listening on port ${port}`);

  const testEmail = `persona_${Date.now()}@ejemplo.com`;

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: CONTROL NEGATIVE ASSERTION (Non-existent Route)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1. CONTROL NEGATIVE ASSERTION:");
    const controlPath = '/api/public/waitlist-inventado-xyz';
    const controlRes = await makeRequest(port, controlPath, 'GET', {});

    if (controlRes.isSpaHtml) {
      console.log(`  [PASS] Non-existent route '${controlPath}' returned HTTP 200 text/html (SPA Fallback). Miss detection confirmed!`);
    } else {
      console.error(`  [FATAL] CONTROL NEGATIVE TEST FAILED! Method failed to detect HTML fallback on non-existent route.`, controlRes);
      server.close();
      await entorno.limpiar();
      process.exit(1);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1B: TABLE EXISTENCE ASSERTION IN POSTGRES (FAILS HARD IF MIGRATION NOT APPLIED)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1B. TABLE EXISTENCE CHECK IN POSTGRES:");
    const { data: wlCheck, error: wlErr } = await adminSupabase
      .from('waitlist')
      .select('id')
      .limit(1);

    if (wlErr && (wlErr.message.includes('Could not find') || wlErr.code === '42P01')) {
      console.error(`  [FATAL] Table 'public.waitlist' does NOT exist in Supabase Postgres!`);
      console.error(`  Error: ${wlErr.message}`);
      console.error(`  Migration 017_waitlist.sql must be applied in Supabase Dashboard SQL Editor.`);
      console.error(`  Aborting test runner — test will not fall back to in-memory store for infrastructure verification.`);
      server.close();
      await entorno.limpiar();
      process.exit(1);
    }
    console.log("  [PASS] Table 'public.waitlist' exists in Supabase Postgres.");

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: POST /api/public/waitlist (Valid Email Submission)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. Testing Public POST /api/public/waitlist (Valid Email):");
    const res1 = await makeRequest(port, '/api/public/waitlist', 'POST', {
      'Content-Type': 'application/json'
    }, {
      email: testEmail,
      name: 'Persona Test',
      role: 'coach',
      locale: 'es'
    });

    const json1 = JSON.parse(res1.body || '{}');
    if (res1.status === 200 && json1.success === true) {
      console.log(`  [PASS] Valid waitlist POST returned HTTP 200 { "success": true }.`);
    } else {
      console.error(`  [FAIL] Valid waitlist POST failed. Output:`, json1);
      passed = false;
    }

    // Verify row stored in database / dev memory store
    let rowCount = 0;
    if (adminSupabase) {
      const { data: dbRows } = await adminSupabase.from('waitlist').select('*').eq('email', testEmail);
      rowCount = dbRows?.length || 0;
    }
    if (rowCount === 0 && devMemoryWaitlist.has(testEmail)) {
      rowCount = 1;
    }

    if (rowCount === 1) {
      console.log(`  [PASS] Verified 1 waitlist record stored for '${testEmail}'.`);
    } else {
      console.error(`  [FAIL] Expected 1 waitlist record, found ${rowCount}.`);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: POST /api/public/waitlist (SAME Duplicate Email Submission)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. Testing Anti-Enumeration & Duplicate Prevention (Same Email Again):");
    const res2 = await makeRequest(port, '/api/public/waitlist', 'POST', {
      'Content-Type': 'application/json'
    }, {
      email: testEmail,
      name: 'Persona Test Duplicate',
      role: 'consultor',
      locale: 'es'
    });

    const json2 = JSON.parse(res2.body || '{}');
    if (res2.status === 200 && json2.success === true) {
      console.log(`  [PASS] Duplicate submission returned HTTP 200 { "success": true } (Anti-enumeration response).`);
    } else {
      console.error(`  [FAIL] Duplicate submission failed. Output:`, json2);
      passed = false;
    }

    // Verify DB/store STILL has EXACTLY 1 row (no 2nd row inserted)
    let dupCount = 0;
    if (adminSupabase) {
      const { data: dbRows } = await adminSupabase.from('waitlist').select('*').eq('email', testEmail);
      dupCount = dbRows?.length || 0;
    }
    if (dupCount === 0 && devMemoryWaitlist.has(testEmail)) {
      dupCount = 1;
    }

    if (dupCount === 1) {
      console.log(`  [PASS] Confirmed EXACTLY 1 row exists in waitlist (duplicate safely ignored).`);
    } else {
      console.error(`  [FAIL] Duplicate row check failed! Found ${dupCount} rows for '${testEmail}'.`);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: POST /api/public/waitlist (Invalid Email Format)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4. Testing Validation Error (Invalid Email Format):");
    const res3 = await makeRequest(port, '/api/public/waitlist', 'POST', {
      'Content-Type': 'application/json'
    }, {
      email: 'no-es-un-email',
      name: 'Tester'
    });

    const json3 = JSON.parse(res3.body || '{}');
    if (res3.status === 400 && json3.success === false) {
      console.log(`  [PASS] Invalid email returned HTTP 400 Bad Request { "success": false, "error": "..." }.`);
    } else {
      console.error(`  [FAIL] Invalid email test failed. Output:`, json3);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: GET /api/admin/waitlist (Unauthenticated Rejection)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n5. Testing GET /api/admin/waitlist Unauthenticated Rejection:");
    const res4 = await makeRequest(port, '/api/admin/waitlist', 'GET', {});
    if (res4.status === 401) {
      console.log(`  [PASS] Unauthenticated GET /api/admin/waitlist rejected with HTTP 401 Unauthorized.`);
    } else {
      console.error(`  [FAIL] Expected HTTP 401, received HTTP ${res4.status}. Output:`, res4.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: GET /api/admin/waitlist (Authenticated Admin Fetch)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n6. Testing GET /api/admin/waitlist (Authenticated Admin):");
    const res5 = await makeRequest(port, '/api/admin/waitlist', 'GET', {
      'Authorization': `Bearer ${validJwt}`,
      'x-organization-slug': orgA_Slug
    });

    const json5 = JSON.parse(res5.body || '{}');
    if (res5.status === 200 && json5.success === true && Array.isArray(json5.waitlist)) {
      console.log(`  [PASS] Authenticated admin fetch returned HTTP 200 with ${json5.waitlist.length} waitlist entries.`);
    } else {
      console.error(`  [FAIL] Authenticated admin waitlist fetch failed. Output:`, json5);
      passed = false;
    }

  } catch (err) {
    console.error("[FATAL] Error during waitlist tests:", err.message);
    passed = false;
  } finally {
    server.close();
    // `waitlist` no tiene organization_id, así que la retirada del coach no la
    // alcanza: la fila sembrada se borra por su correo.
    await adminSupabase.from('waitlist').delete().eq('email', testEmail);
    await entorno.limpiar();
  }

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("WAITLIST ENGINE VERDICT: ALL TESTS PASSED — PASS");
  } else {
    console.log("WAITLIST ENGINE VERDICT: FAILED");
    process.exit(1);
  }
}

runWaitlistTests();
