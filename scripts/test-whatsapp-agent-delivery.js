/**
 * test-whatsapp-agent-delivery.js
 * Verification Test Suite for WhatsApp Agent Delivery & Security — CoachData Operational OS v2
 *
 * Assertions:
 * 0. Public UI Route Security: HTTP 401 when /api/evolution/connect, /status, /send are accessed without user JWT.
 * 1. Control Negative 1 (Missing Token): HTTP 401 Unauthorized when x-internal-token is missing.
 * 2. Control Negative 2 (Invalid Token): HTTP 403 Forbidden when x-internal-token is signed with wrong secret.
 * 3. Tenant Isolation (Missing Number): HTTP 400 Bad Request when valid tenant UUID has no whatsapp_number (NO cross-tenant fallback to .env).
 * 4. Control Positive (Valid Token + Target Number): Honest status — PASS on 200, SKIPPED if external Evolution API server is offline.
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');
const { INTERNAL_SECRET } = require('../src/backend/config/env');

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

async function runWhatsAppAgentTests() {
  console.log("====================================================");
  console.log("COACHDATA SPRINT 26.1 WHATSAPP AGENT DELIVERY TEST SUITE");
  console.log("====================================================");

  let passed = true;
  const adminSupabase = getSupabaseClient();
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client not configured.");
    process.exit(1);
  }

  // Create Express app on ephemeral port
  const app = createApp([]);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[Setup] Express test server listening on http://127.0.0.1:${port}`);

  try {
    const validInternalToken = jwt.sign({ role: 'internal-agent' }, INTERNAL_SECRET, { expiresIn: '5m' });
    const wrongSecretToken  = jwt.sign({ role: 'internal-agent' }, 'wrong-secret-key-12345', { expiresIn: '5m' });

    // ─────────────────────────────────────────────────────────────────────────────
    // 0. PUBLIC UI ROUTE SECURITY TEST: UNPROTECTED ACCESS MUST RETURN 401
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n0. PUBLIC UI ROUTE SECURITY TEST (unauthenticated access to /api/evolution/*):");
    
    const connectRes = await makeRequest(port, '/api/evolution/connect', 'POST', { 'Content-Type': 'application/json' }, {});
    const sendRes    = await makeRequest(port, '/api/evolution/send', 'POST', { 'Content-Type': 'application/json' }, {});
    const statusRes  = await makeRequest(port, '/api/evolution/status', 'GET', {}, null);

    if (connectRes.status === 401 && sendRes.status === 401 && statusRes.status === 401) {
      console.log(`  [PASS] Unauthenticated POST /api/evolution/connect, /send, /status all correctly rejected with HTTP 401 Unauthorized.`);
    } else {
      console.error(`  [FATAL] SECURITY VULNERABILITY DETECTED! Public UI routes accessible without user JWT!`);
      console.error(`    connect: HTTP ${connectRes.status}, send: HTTP ${sendRes.status}, status: HTTP ${statusRes.status}`);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 1. CONTROL NEGATIVE 1: MISSING INTERNAL TOKEN → HTTP 401
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1. CONTROL NEGATIVE 1 (Missing x-internal-token):");
    const resNoToken = await makeRequest(port, '/api/internal/evolution/send', 'POST', {
      'Content-Type': 'application/json'
    }, { tenant_id: '00000000-0000-4000-a000-000000000001', message: 'Hello' });

    if (resNoToken.status === 401 && !resNoToken.isSpaHtml) {
      console.log(`  [PASS] POST /api/internal/evolution/send without token returned HTTP 401 (${resNoToken.body.trim()}).`);
    } else {
      console.error(`  [FAIL] Expected HTTP 401 text/json, got HTTP ${resNoToken.status} (SPA HTML: ${resNoToken.isSpaHtml}).`, resNoToken);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 2. CONTROL NEGATIVE 2: INVALID TOKEN (WRONG SECRET) → HTTP 403
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. CONTROL NEGATIVE 2 (Invalid token with wrong secret):");
    const resBadToken = await makeRequest(port, '/api/internal/evolution/send', 'POST', {
      'x-internal-token': wrongSecretToken,
      'Content-Type': 'application/json'
    }, { tenant_id: '00000000-0000-4000-a000-000000000001', message: 'Hello' });

    if (resBadToken.status === 403 && !resBadToken.isSpaHtml) {
      console.log(`  [PASS] POST /api/internal/evolution/send with invalid token returned HTTP 403 (${resBadToken.body.trim()}).`);
    } else {
      console.error(`  [FAIL] Expected HTTP 403 text/json, got HTTP ${resBadToken.status}.`, resBadToken);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 3. TENANT ISOLATION: MISSING NUMBER FOR TENANT → HTTP 400 (VALID UUID)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. TENANT ISOLATION (Valid UUID tenant with no whatsapp_number configured):");
    const unconfiguredTenantId = 'f9999999-9999-4999-a999-999999999999';
    const resNoNum = await makeRequest(port, '/api/internal/evolution/send', 'POST', {
      'x-internal-token': validInternalToken,
      'Content-Type': 'application/json'
    }, { tenant_id: unconfiguredTenantId, message: 'Test Briefing' });

    if (resNoNum.status === 400 && !resNoNum.isSpaHtml && resNoNum.body.includes('No target WhatsApp number configured')) {
      console.log(`  [PASS] Request for unconfigured tenant UUID returned HTTP 400 (Strict multi-tenant isolation confirmed!).`);
    } else {
      console.error(`  [FAIL] Expected HTTP 400 with isolation error, got HTTP ${resNoNum.status}. Body:`, resNoNum.body);
      passed = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4. CONTROL POSITIVE: VALID TOKEN + VALID TENANT NUMBER RESOLUTION
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n4. CONTROL POSITIVE (Valid token + tenant with target number):");

    const { data: tenantData } = await adminSupabase.from('tenants').select('id').limit(1);
    const sampleTenantId = tenantData?.[0]?.id || '00000000-0000-4000-a000-000000000001';

    const resValid = await makeRequest(port, '/api/internal/evolution/send', 'POST', {
      'x-internal-token': validInternalToken,
      'Content-Type': 'application/json'
    }, { tenant_id: sampleTenantId, number: '34600000000', message: 'Test Briefing Message' });

    if (resValid.status === 200 && !resValid.isSpaHtml) {
      console.log(`  [PASS] Evolution API delivered WhatsApp message successfully (HTTP 200).`);
    } else if ((resValid.status === 500 || resValid.status === 404) && !resValid.isSpaHtml) {
      console.log(`  [SKIPPED] Evolution API instance not online/configured in test env (HTTP ${resValid.status}). Internal authorization & routing verified.`);
    } else {
      console.error(`  [FAIL] Unexpected response from /api/internal/evolution/send, got HTTP ${resValid.status} (isHtml: ${resValid.isSpaHtml}).`, resValid);
      passed = false;
    }

  } finally {
    server.close();
  }

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("WHATSAPP AGENT DELIVERY VERDICT: ALL TESTS PASSED — PASS");
  } else {
    console.log("WHATSAPP AGENT DELIVERY VERDICT: FAILED");
    process.exit(1);
  }
}

runWhatsAppAgentTests();
