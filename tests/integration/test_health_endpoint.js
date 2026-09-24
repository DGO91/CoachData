// /api/system/health tiene que responder 503 cuando la base no contesta.
//
// Antes respondía 200 con status 'ok' pasara lo que pasara: un monitor externo,
// que solo mira el código HTTP, habría dado por sana una app sin base de datos.
//
// Cada caso corre en un proceso aparte porque getSupabaseClient() guarda el
// cliente la primera vez y no se puede cambiar de URL dentro del mismo proceso.
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');

const ROUTER = path.resolve(__dirname, '../../src/backend/infrastructure/web/routes/systemRoutes.js');
const PUBLICA = 'sb_publishable_Mao5AqJ_fKNGRAv0fpOtCg_arcryaRa';
const URL_REAL = 'https://your-project.supabase.co';

// Levanta solo el router de sistema, pide /health y escribe {status, body}.
const HIJO = `
  const express = require('express');
  const http = require('http');
  const app = express();
  app.use('/api/system', require(${JSON.stringify(ROUTER)}));
  const server = app.listen(0, () => {
    http.get({ port: server.address().port, path: '/api/system/health' }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        process.stdout.write(JSON.stringify({ status: res.statusCode, body: JSON.parse(body) }));
        server.close();
      });
    });
  });
`;

function pedir(env) {
  const r = spawnSync(process.execPath, ['-e', HIJO], {
    // Sin heredar el .env: cada caso decide qué clave ve el cliente.
    env: { PATH: process.env.PATH, DOTENV_CONFIG_QUIET: 'true', ...env },
    encoding: 'utf8',
    timeout: 60000,
  });
  const linea = (r.stdout || '').trim().split('\n').pop();
  try {
    return JSON.parse(linea);
  } catch {
    return { status: 0, error: r.stderr || r.stdout };
  }
}

let failures = 0;
function check(condition, message, detail) {
  if (condition) console.log(`PASS: ${message}`);
  else { failures++; console.error(`FAIL: ${message}`, detail ?? ''); }
}

console.log('=== HEALTH ENDPOINT ===\n');

// 1. Base inalcanzable → 503. Puerto 9 (discard) en local: la conexión se rechaza al instante.
const caida = pedir({ SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_KEY: PUBLICA });
check(caida.status === 503, 'base inalcanzable → 503', caida);
check(caida.body?.status === 'degraded', 'base inalcanzable → status degraded', caida.body);

// 2. Base real con la clave pública (la situación de CI): contesta aunque niegue el acceso → 200.
const publica = pedir({ SUPABASE_URL: URL_REAL, SUPABASE_KEY: PUBLICA });
check(publica.status === 200, 'base real con clave pública → 200', publica);

// 3. Con la clave de servicio, si está (local), la consulta pasa limpia.
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const servicio = pedir({ SUPABASE_URL: URL_REAL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY });
  check(servicio.status === 200 && servicio.body?.metrics?.databaseStatus === 'connected',
    'base real con clave de servicio → 200 connected', servicio.body?.metrics);
} else {
  console.log('OMITIDO: caso con clave de servicio (no está en este entorno)');
}

if (failures > 0) {
  console.error(`\n=== ${failures} FALLO(S) ===`);
  process.exit(1);
}
console.log('\n=== HEALTH ENDPOINT TESTS PASSED ===');
