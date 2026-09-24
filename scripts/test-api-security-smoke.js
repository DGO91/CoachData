/**
 * test-api-security-smoke.js
 * REAL HTTP API Security Smoke Test Suite — CoachData Operational OS v2
 * Uses real HTTP requests and real Supabase Auth tokens to test router security and 5s TTL cache.
 */

require('dotenv').config();
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { createApp } = require('../src/backend/infrastructure/web/app');
const { getSupabaseClient } = require('../src/backend/infrastructure/database/supabaseClient');

function makeRequest(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runAPISecuritySmokeTests() {
  console.log("====================================================");
  console.log("COACHDATA SPRINT 26.1 REAL HTTP API SECURITY SMOKE TESTS");
  console.log("====================================================");

  let passed = true;
let omitidos = 0;
  const app = createApp([]);
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`[TestServer] Express listening on ephemeral port ${port}`);

  const protectedRoutes = [
    '/api/users',
    '/api/admin/tenants',
    '/api/agents/status',
    '/api/google-agents/morning-briefing/live',
    '/api/evolution/status',
    '/api/nango/session-token',
    '/api/revenue/leads',
    '/api/billing/subscription'
  ];

  try {
    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Requests without Authorization header MUST return HTTP 401
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n1. Testing 401 Unauthorized (No Authorization header):");
    for (const route of protectedRoutes) {
      const res = await makeRequest(port, route);
      if (res.status === 401) {
        console.log(`  [PASS] GET ${route} -> Status: ${res.status} (Rejected unauthenticated request)`);
      } else {
        console.error(`  [FAIL] GET ${route} -> Status: ${res.status} (Expected 401)`);
        passed = false;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Requests with invalid Authorization header MUST return HTTP 403
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n2. Testing Tenant Context Requirement (Invalid JWT token):");
    for (const route of protectedRoutes) {
      const res = await makeRequest(port, route, { 'Authorization': 'Bearer fake_invalid_jwt_token' });
      if (res.status === 403 || res.status === 401) {
        console.log(`  [PASS] GET ${route} (with invalid JWT) -> Status: ${res.status} (Rejected invalid token)`);
      } else {
        console.error(`  [FAIL] GET ${route} -> Status: ${res.status} (Expected 403/401)`);
        passed = false;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Real 5-second TTL Cache Test on /api/agents/status with VALID AUTH
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n3. Testing Real 5-second TTL Cache on /api/agents/status (Authenticated):");
    
    // Un coach de prueba propio, creado y borrado por este script. Antes se
    // tomaba un usuario real y se le reescribía la contraseña a un valor fijo
    // escrito en este mismo fichero — y en cada pasada del CI. Los identificadores
    // usados eran los de los administradores del producto.
    const { crearEntorno } = require('./lib/coaches-efimeros');
    let entorno = null;

    // Este paso crea un coach efímero de verdad, y para eso hace falta la clave
    // de servicio. En CI no existe: es un secreto y no viaja en el repositorio.
    //
    // Se salta, pero RUIDOSAMENTE y solo aquí. Los pasos 1 y 2 —los que de
    // verdad comprueban seguridad— siguen siendo obligatorios en CI y se
    // ejecutan con las claves públicas. Lo que se pierde es la comprobación de
    // la caché de 5 s, que es de comportamiento, no de seguridad.
    //
    // Un salto silencioso seria peor que no tener el test: daria un verde que
    // nadie podria interpretar. Por eso se anuncia en la salida y se cuenta.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('  [SKIP] Paso 3 omitido: falta SUPABASE_SERVICE_ROLE_KEY.');
      console.log('         Crea un coach real, asi que solo corre en local o');
      console.log('         con el secreto configurado en el repositorio.');
      console.log('         Los pasos 1 y 2 SI se han ejecutado.');
      omitidos++;
      console.log("\n----------------------------------------------------");
      console.log(`API SECURITY SMOKE VERDICT: ${passed ? 'PASSED' : 'FAILED'}${omitidos ? ` (${omitidos} paso(s) omitido(s) por falta de credenciales)` : ''}`);
      server.close();
      process.exit(passed ? 0 : 1);
    }

    try {
      entorno = await crearEntorno(['smoke']);
      const coach = entorno.coaches.smoke;

      const validHeaders = {
        'Authorization': `Bearer ${coach.token}`,
        'x-organization-slug': coach.slug
      };

      const res1 = await makeRequest(port, '/api/agents/status', validHeaders);
      const json1 = JSON.parse(res1.body || '{}');

      const res2 = await makeRequest(port, '/api/agents/status', validHeaders);
      const json2 = JSON.parse(res2.body || '{}');

      if (res2.status === 200 && json2.cached === true && typeof json2.cacheAgeMs === 'number') {
        console.log(`  [PASS] Llamada 1 (cached=${json1.cached}) -> llamada 2 servida desde la caché de 5s (cached=${json2.cached}, cacheAgeMs=${json2.cacheAgeMs}ms).`);
      } else {
        console.error(`  [FAIL] La caché no respondió como se esperaba. Estado de la 2ª llamada: ${res2.status}, cuerpo:`, json2);
        passed = false;
      }
    } catch (err) {
      console.error(`  [FAIL] No se pudo preparar el coach de prueba: ${err.message}`);
      passed = false;
    } finally {
      if (entorno) await entorno.limpiar();
    }

  } catch (err) {
    console.error("[FATAL] Error running HTTP security tests:", err.message);
    passed = false;
  } finally {
    server.close();
  }

  console.log("\n----------------------------------------------------");
  if (passed) {
    console.log("API SECURITY SMOKE VERDICT: ALL REAL HTTP TESTS PASSED — PASS");
  } else {
    console.log("API SECURITY SMOKE VERDICT: FAILED");
    process.exit(1);
  }
}

runAPISecuritySmokeTests();
