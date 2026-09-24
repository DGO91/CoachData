/**
 * audit-reachable-routes.js
 * Authenticated Reachable Routes Audit with Dual-Pass & Control Negative Assertion — CoachData Operational OS v2
 *
 * Pass 1: Audits all backend declared routes in Express routers.
 * Pass 2: Audits all frontend source code fetch/axios calls extracted via regex.
 * Control Negative Assertion: Verifies non-existent route returns HTML SPA fallback.
 *
 * La auditoría recorre las rutas con el JWT de un coach efímero. Antes usaba una
 * cuenta real —reescribiéndole la contraseña a un valor fijo escrito aquí— y la
 * organización 'test-org-1', así que los POST de la pasada 2 escribían sobre
 * datos que no eran de prueba.
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { crearEntorno } = require('./lib/coaches-efimeros');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');

function makeRequest(port, routePath, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
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
          bodySnippet: bodyTrim.substring(0, 80)
        });
      });
    });
    req.on('error', (err) => resolve({ status: 500, error: err.message, isSpaHtml: false, bodySnippet: '' }));
    req.end();
  });
}

function findFrontendCalls() {
  const frontendDir = path.join(__dirname, '../src/frontend/src');
  const calls = new Set();
  
  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(/['"`](\/api\/[a-zA-Z0-9_\-\/:${}]+)['"`]/g);
        if (matches) {
          matches.forEach(m => {
            let clean = m.replace(/['"`]/g, '');
            clean = clean.replace(/\$\{[^}]+\}/g, 'test-param');
            calls.add(clean);
          });
        }
      }
    }
  }

  scanDir(frontendDir);
  return Array.from(calls);
}

async function auditRoutes() {
  console.log("====================================================");
  console.log("COACHDATA SPRINT 26.1 DUAL-PASS REACHABLE ROUTES AUDIT");
  console.log("====================================================");

  const adminSupabase = getSupabaseClient();
  if (!adminSupabase) {
    console.error("[FATAL] Supabase client not configured in environment.");
    process.exit(1);
  }

  // 1. Coach efímero: JWT real, organización propia y desechable.
  const entorno = await crearEntorno(['auditor']);
  const coach = entorno.coaches.auditor;
  const orgA_Slug = coach.slug;

  const authHeaders = {
    'Authorization': `Bearer ${coach.token}`,
    'x-organization-slug': orgA_Slug,
    'Content-Type': 'application/json'
  };

  console.log(`[Setup] Authenticated as ${coach.email} (Org Slug: ${orgA_Slug}).`);

  // 2. Launch Express App on Ephemeral Port
  const app = createApp([]);
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`[Server] Live test server listening on port ${port}`);

  // 3. CONTROL NEGATIVE TEST ASSERTION
  console.log("\n🧪 CONTROL NEGATIVE TEST ASSERTION:");
  const controlPath = '/api/control-negative-nonexistent-route-xyz';
  const controlRes = await makeRequest(port, controlPath, 'GET', authHeaders);

  if (controlRes.isSpaHtml) {
    console.log(`  [PASS] Control non-existent route '${controlPath}' returned HTTP ${controlRes.status} text/html (SPA Fallback). Audit method correctly detects misses!`);
  } else {
    console.error(`  [FATAL] CONTROL NEGATIVE TEST FAILED! Audit script failed to detect SPA HTML fallback on non-existent route. Output:`, controlRes);
    server.close();
    await entorno.limpiar();
    process.exit(1);
  }

  // 4. Test Unauthenticated Public Invitation Validation Endpoint
  console.log("\n🔑 PUBLIC INVITATION ENDPOINTS ASSERTION (UNAUTHENTICATED):");
  const publicInviteRes1 = await makeRequest(port, '/api/invitations/validate/INV-TEST1234', 'GET', {});
  if (!publicInviteRes1.isSpaHtml && publicInviteRes1.status === 200) {
    console.log(`  [PASS] Public Unauthenticated GET /api/invitations/validate/INV-TEST1234 -> HTTP 200 JSON (${publicInviteRes1.bodySnippet})`);
  } else {
    console.error(`  [FAIL] Public Unauthenticated invitation check failed:`, publicInviteRes1);
  }

  const publicInviteRes2 = await makeRequest(port, '/api/public/invitations/validate/INV-TEST1234', 'GET', {});
  if (!publicInviteRes2.isSpaHtml && publicInviteRes2.status === 200) {
    console.log(`  [PASS] Public Unauthenticated GET /api/public/invitations/validate/INV-TEST1234 -> HTTP 200 JSON (${publicInviteRes2.bodySnippet})`);
  } else {
    console.error(`  [FAIL] Public Unauthenticated invitation check failed:`, publicInviteRes2);
  }

  // 5. PASS 1: Auditing Declared Routes
  console.log("\n--- PASS 1: Auditing Backend Declared Routes ---\n");

  const routeGroups = [
    {
      file: 'userRoutes.js',
      mount: '/api/users',
      routes: [
        { path: '/api/users', method: 'GET', desc: 'List users' },
        { path: '/api/users/user-profile', method: 'GET', desc: 'Get local user profile' },
        { path: '/api/users/auditor/credentials-audit', method: 'GET', desc: 'Credentials audit' }
      ]
    },
    {
      file: 'adminRoutes.js',
      mount: '/api/admin',
      routes: [
        { path: '/api/admin/tenants', method: 'GET', desc: 'List admin tenants' },
        { path: '/api/admin/users', method: 'GET', desc: 'List admin users' },
        { path: '/api/admin/waitlist', method: 'GET', desc: 'Fetch public waitlist submissions' }
      ]
    },
    {
      file: 'publicWaitlistRoutes.js',
      mount: '/api/public/waitlist',
      routes: [
        { path: '/api/public/waitlist', method: 'POST', desc: 'Submit email to waitlist' }
      ]
    },
    {
      file: 'tenantVaultRoutes.js',
      mount: '/api/tenant-vault',
      routes: [
        { path: '/api/tenant-vault/me', method: 'GET', desc: 'Get own tenant info' },
        { path: '/api/tenant-vault/keys', method: 'GET', desc: 'Get safe tenant keys' }
      ]
    },
    {
      file: 'organizationRoutes.js',
      mount: '/api/organization',
      routes: [
        { path: '/api/organization/me', method: 'GET', desc: 'Get org profile' },
        { path: '/api/organization/members', method: 'GET', desc: 'List members' },
        { path: '/api/organization/pipeline-stages', method: 'GET', desc: 'Get pipeline stages' },
        { path: '/api/organization/export', method: 'GET', desc: 'Export workspace' },
        { path: '/api/organization/invitations', method: 'GET', desc: 'List invitations' }
      ]
    },
    {
      file: 'agentRoutes.js',
      mount: '/api/agents',
      routes: [
        { path: '/api/agents/status', method: 'GET', desc: 'Subsystem status (Cached 5s)' },
        { path: '/api/agents/personal-agent-status', method: 'GET', desc: 'Personal agent status' },
        { path: '/api/agents/evening-summary-status', method: 'GET', desc: 'Evening summary status' },
        { path: '/api/agents/precall-schedule-status', method: 'GET', desc: 'Precall schedule status' }
      ]
    },
    {
      file: 'googleAgentRoutes.js',
      mount: '/api/google-agents & /api/agents',
      routes: [
        { path: '/api/agents/morning-briefing/live', method: 'GET', desc: 'Morning briefing via /api/agents' },
        { path: '/api/google-agents/morning-briefing/live', method: 'GET', desc: 'Morning briefing via /api/google-agents' },
        { path: '/api/google-agents/evening-summary/live', method: 'GET', desc: 'Evening summary live' },
        { path: '/api/google-agents/weekly-digest/live', method: 'GET', desc: 'Weekly digest live' },
        { path: '/api/google-agents/mail-responder/live', method: 'GET', desc: 'Mail responder live' }
      ]
    },
    {
      file: 'revenueRoutes.js',
      mount: '/api/revenue',
      routes: [
        { path: '/api/revenue/leads', method: 'GET', desc: 'Fetch CRM contacts' },
        { path: '/api/revenue/make-status', method: 'GET', desc: 'Make status fallback' }
      ]
    },
    {
      file: 'billingRoutes.js',
      mount: '/api/billing',
      routes: [
        { path: '/api/billing/subscription', method: 'GET', desc: 'Get active subscription' },
        { path: '/api/billing/invoices', method: 'GET', desc: 'Get invoice history' }
      ]
    },
    {
      file: 'publicProposalRoutes.js',
      mount: '/api/public/proposals',
      routes: [
        { path: '/api/public/proposals/test-token-123', method: 'GET', desc: 'Fetch public proposal' }
      ]
    },
    {
      file: 'evolutionRoutes.js',
      mount: '/api/evolution',
      routes: [
        { path: '/api/evolution/status', method: 'GET', desc: 'WhatsApp instance status' }
      ]
    },
    {
      file: 'intelligenceRoutes.js',
      mount: '/api/intelligence',
      routes: [
        { path: '/api/intelligence/agents', method: 'GET', desc: 'List Orchestrator agents' }
      ]
    },
    {
      file: 'systemRoutes.js',
      mount: '/api/system',
      routes: [
        { path: '/api/system/health', method: 'GET', desc: 'System health check' }
      ]
    }
  ];

  for (const group of routeGroups) {
    console.log(`📁 Router File: ${group.file} (${group.mount})`);
    for (const r of group.routes) {
      const res = await makeRequest(port, r.path, r.method, authHeaders);
      const isReachable = !res.isSpaHtml;

      if (isReachable) {
        console.log(`   [${r.method}] ${r.path.padEnd(46)} -> HTTP ${res.status} | ✅ REAL JSON HIT (${res.bodySnippet.substring(0, 35)})`);
      } else {
        console.log(`   [${r.method}] ${r.path.padEnd(46)} -> HTTP ${res.status} | ❌ HTML SPA FALLBACK (UNREACHABLE)`);
      }
    }
  }

  // 6. PASS 2: Auditing Frontend Invocations Extracted via Regex
  console.log("\n--- PASS 2: Auditing Frontend Source Code Calls ---\n");
  const frontendCalls = findFrontendCalls();
  console.log(`[Frontend Scan] Testing ${frontendCalls.length} unique frontend API calls...\n`);

  let feHit = 0;
  let feMiss = 0;

  for (const feCall of frontendCalls) {
    let res = await makeRequest(port, feCall, 'GET', authHeaders);
    let method = 'GET';
    if (res.isSpaHtml) {
      // Action routes (run, stop, create, set, redeem) are POST routes
      const postRes = await makeRequest(port, feCall, 'POST', authHeaders, {});
      if (!postRes.isSpaHtml) {
        res = postRes;
        method = 'POST';
      }
    }

    const isHit = !res.isSpaHtml;
    if (isHit) {
      feHit++;
      console.log(`   [Frontend Call ${method.padEnd(4)}] ${feCall.padEnd(48)} -> HTTP ${res.status} | ✅ REAL JSON HIT`);
    } else {
      feMiss++;
      console.log(`   [Frontend Call GET/POST] ${feCall.padEnd(48)} -> HTTP ${res.status} | ❌ HTML SPA FALLBACK (UNREACHABLE)`);
    }
  }

  console.log("\n----------------------------------------------------");
  console.log(`Pass 2 Summary: ${feHit}/${frontendCalls.length} frontend calls matched backend JSON routes (${feMiss} misses).`);

  server.close();
  // La pasada 2 lanza POST contra rutas de acción: lo que hayan escrito se va
  // con la organización efímera.
  await entorno.limpiar();
  console.log('[Cleanup] Coach efímero retirado.');
}

auditRoutes();
