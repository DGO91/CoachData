/**
 * test-invitations-routing.js
 * Fija qué router sirve cada ruta de /api/invitations.
 *
 * Dos routers se montan sobre el mismo prefijo: publicInvitationRoutes (sin
 * auth, primero) e invitationRoutes (con auth, después). Express resuelve por
 * orden de registro, así que /validate/:code y /use/:code los sirve el público
 * —que es el que debe servirlos: un invitado todavía no tiene cuenta— y las
 * copias de invitationRoutes son inalcanzables.
 *
 * Este test se ejecuta antes y después de eliminar ese código muerto: el
 * comportamiento observable debe ser idéntico.
 */
require('dotenv').config();
const http = require('http');
const { createApp } = require('../src/backend/infrastructure/web/app');

function req(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: '127.0.0.1', port, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, ctype: res.headers['content-type'] || '', body: b }));
    });
    r.on('error', reject);
    if (data) r.write(data);
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

  // 1. validate lo sirve el router público: responde JSON sin exigir JWT.
  const val = await req(port, 'GET', '/api/invitations/validate/CODIGO-INEXISTENTE');
  check('GET /validate/:code no exige auth', val.status !== 401 && val.status !== 403, `status=${val.status}`);
  check('GET /validate/:code responde JSON (no el HTML del catch-all)',
    val.ctype.includes('application/json'), `content-type=${val.ctype}`);

  // 2. La validación de UUID sólo existe en el router público. Que responda 400
  //    ante un user_id malformado prueba QUÉ implementación está corriendo.
  const bad = await req(port, 'POST', '/api/invitations/use/ALGUN-CODIGO', { user_id: 'no-es-uuid' });
  check('POST /use/:code valida el formato de user_id (marca del router público)',
    bad.status === 400, `status=${bad.status} body=${bad.body.slice(0, 80)}`);

  // 3. /generate sólo existe en el router autenticado: debe pedir credenciales.
  const gen = await req(port, 'POST', '/api/invitations/generate', { email: 'x@y.com' });
  check('POST /generate sigue exigiendo autenticación',
    gen.status === 401 || gen.status === 403, `status=${gen.status}`);

  // 4. Bajo /api/invitations, un path que ningún router declara NO llega al
  //    catch-all: lo corta antes el authMiddleware del segundo montaje. Eso
  //    demuestra que el router autenticado sigue activo para el resto del
  //    prefijo, que es justo lo que no debe cambiar al limpiar el código muerto.
  const unknown = await req(port, 'GET', '/api/invitations/ruta-que-no-existe');
  check('un path no declarado bajo el prefijo lo corta authMiddleware (401)',
    unknown.status === 401, `status=${unknown.status}`);

  // 5. CONTROL: fuera del prefijo sí se llega al catch-all HTML. Sin esto, los
  //    checks de arriba podrían estar pasando por accidente.
  const ghost = await req(port, 'GET', '/ruta-inexistente-fuera-de-api');
  check('CONTROL: fuera del prefijo sí cae al catch-all HTML',
    ghost.ctype.includes('text/html'), `content-type=${ghost.ctype}`);

  server.close();
  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
