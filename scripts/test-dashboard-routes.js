/**
 * test-dashboard-routes.js
 * Las rutas que alimentan el panel principal existen y no se sombrean entre sí.
 *
 * /api/agents tiene tres routers montados sobre el mismo prefijo. Express
 * resuelve por orden de registro, así que un router genérico registrado antes se
 * quedaría con /telemetry y la llamada acabaría en el sitio equivocado — o peor,
 * en el catch-all que devuelve el index.html con 200, que es el modo de fallo
 * característico de este backend.
 */
require('dotenv').config();
const http = require('http');
const { createApp } = require('../src/backend/infrastructure/web/app');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

(async () => {
  const server = createApp([]).listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;

  const get = (p) => new Promise((res, rej) => {
    const r = http.get({ hostname: '127.0.0.1', port, path: p }, x => {
      let s = ''; x.on('data', c => s += c);
      x.on('end', () => res({ status: x.statusCode, ctype: x.headers['content-type'] || '', body: s }));
    });
    r.on('error', rej);
  });

  const tel = await get('/api/agents/telemetry');
  check('/api/agents/telemetry responde JSON, no el HTML del catch-all',
    tel.ctype.includes('application/json'), `content-type=${tel.ctype}`);
  check('/api/agents/telemetry exige sesión',
    tel.status === 401, `status=${tel.status}`);

  // Si un router genérico se hubiera quedado con el prefijo, esta ruta
  // devolvería 404 en vez de 401: el 401 prueba que sigue habiendo un router
  // detrás que la reconoce.
  const rep = await get('/api/agents/reports');
  check('/api/agents/reports sigue respondiendo (no lo sombrea telemetry)',
    rep.status === 401 && rep.ctype.includes('application/json'), `status=${rep.status}`);

  const est = await get('/api/agents/status');
  check('/api/agents/status sigue respondiendo (router genérico intacto)',
    est.status === 401, `status=${est.status}`);

  // CONTROL: una ruta que de verdad no existe bajo ese prefijo cae al catch-all.
  const fantasma = await get('/ruta-que-no-existe-fuera-de-api');
  check('CONTROL: fuera de /api sí se sirve el HTML del SPA',
    fantasma.ctype.includes('text/html'), `content-type=${fantasma.ctype}`);

  server.close();
  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
