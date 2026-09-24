/**
 * test-cors-whitelist.js
 * Verifica que la API sólo autoriza orígenes conocidos.
 *
 * Antes era `cors()` sin argumentos, que responde
 * Access-Control-Allow-Origin: * a cualquier web. La sesión viaja en la cabecera
 * Authorization y no en cookies, así que no había robo automático de sesión,
 * pero la API quedaba abierta a cualquier página.
 */
require('dotenv').config();
const http = require('http');
const { createApp } = require('../src/backend/infrastructure/web/app');

function pedir(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      res.resume();
      res.on('end', () => resolve({
        status: res.statusCode,
        allowOrigin: res.headers['access-control-allow-origin']
      }));
    });
    r.on('error', reject);
    r.end();
  });
}

(async () => {
  const server = createApp([]).listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;
  let failed = 0;
  const check = (name, cond, detail) => {
    if (cond) console.log(`[PASS] ${name}`);
    else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
  };

  const RUTA = '/api/system/health';

  // 1. Un origen legítimo recibe permiso explícito.
  const propio = await pedir(port, RUTA, { Origin: 'https://app.coachdata.example' });
  check('origen propio autorizado',
    propio.allowOrigin === 'https://app.coachdata.example',
    `allow-origin=${propio.allowOrigin}`);

  // 2. Un origen ajeno no recibe cabecera de permiso: el navegador bloquea la
  //    lectura de la respuesta.
  const ajeno = await pedir(port, RUTA, { Origin: 'https://sitio-atacante.example' });
  check('origen ajeno sin cabecera de permiso',
    !ajeno.allowOrigin, `allow-origin=${ajeno.allowOrigin}`);

  // 3. Y en ningún caso se responde con comodín.
  check('nunca se responde Access-Control-Allow-Origin: *',
    propio.allowOrigin !== '*' && ajeno.allowOrigin !== '*',
    `propio=${propio.allowOrigin} ajeno=${ajeno.allowOrigin}`);

  // 4. Sin cabecera Origin —webhooks, curl, health checks— la petición pasa:
  //    CORS no gobierna ese tráfico y bloquearlo rompería las integraciones.
  const sinOrigin = await pedir(port, RUTA);
  check('petición sin Origin (webhook/curl) no se bloquea',
    sinOrigin.status < 500, `status=${sinOrigin.status}`);

  // 5. CONTROL POSITIVO: la ruta usada existe de verdad. Si devolviera el HTML
  //    del catch-all, los checks de arriba dirían poco.
  check('CONTROL: la ruta de prueba responde',
    sinOrigin.status === 200, `status=${sinOrigin.status} en ${RUTA}`);

  server.close();
  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
