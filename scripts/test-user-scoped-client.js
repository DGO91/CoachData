/**
 * test-user-scoped-client.js
 * El cliente que consulta con la identidad del usuario.
 *
 * Sólo comprueba la construcción del cliente y el middleware. Que RLS proteja de
 * verdad se prueba aparte, en test-rls-user-scoped.js, con dos usuarios reales:
 * eso necesita base de datos y no puede vivir en un test de unidad.
 */
require('dotenv').config();
const path = require('path');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

const RUTA = path.resolve(__dirname, '../src/backend/infrastructure/database/userScopedClient.js');
function cargar(env) {
  const previo = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY };
  if ('url' in env) { if (env.url === null) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = env.url; }
  if ('anon' in env) { if (env.anon === null) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = env.anon; }
  delete require.cache[RUTA];
  const mod = require(RUTA);
  return { mod, restaurar: () => { process.env.SUPABASE_URL = previo.url; process.env.SUPABASE_ANON_KEY = previo.anon; } };
}

function ejecutar(mw, headers) {
  let estado = null, siguiente = false;
  const req = { headers };
  const res = { status(c) { estado = c; return res; }, json() { return res; } };
  mw(req, res, () => { siguiente = true; });
  return { req, estado, siguiente };
}

(async () => {
  const { mod } = cargar({});
  const { crearClienteDeUsuario, userScopedClientMiddleware } = mod;

  // 1. Con token se obtiene un cliente utilizable.
  const cliente = crearClienteDeUsuario('token-de-prueba');
  check('con un token se construye un cliente', !!cliente && typeof cliente.from === 'function',
    'no devolvió un cliente usable');

  // 2. El token viaja en la cabecera: es lo que hace que Postgres sepa quién
  //    consulta y pueda aplicar las políticas.
  // Ojo al leerlo: `cliente.rest.headers` existe pero llega vacío, y como {} es
  // truthy, un `a || b` se queda con el objeto equivocado. El token viaja en
  // cliente.headers.Authorization.
  const auth = cliente?.headers?.Authorization || '';
  check('el cliente lleva el token del usuario en sus cabeceras',
    auth === 'Bearer token-de-prueba', `Authorization=${auth || '(vacía)'}`);

  // 3. Sin token no se inventa un cliente.
  check('sin token no se construye nada', crearClienteDeUsuario(null) === null, 'devolvió algo');

  // 4. El middleware cuelga el cliente de la petición.
  let r = ejecutar(userScopedClientMiddleware, { authorization: 'Bearer abc123' });
  check('el middleware deja el cliente en req.db', !!r.req.db && r.siguiente, `pasó=${r.siguiente}`);

  // 5. Sin cabecera, req.db queda a null y la ruta decide. No se degrada a un
  //    cliente con más permisos, que es lo que anularía todo el propósito.
  r = ejecutar(userScopedClientMiddleware, {});
  check('sin cabecera deja req.db a null y no bloquea', r.req.db === null && r.siguiente,
    `db=${r.req.db} pasó=${r.siguiente}`);

  // 6. CONTROL: sin clave anónima no cae a la de servicio; corta con 503. Caer a
  //    service_role aquí saltaría RLS en silencio, que es justo lo que este
  //    módulo existe para evitar.
  const { mod: mod2, restaurar } = cargar({ anon: null });
  r = ejecutar(mod2.userScopedClientMiddleware, { authorization: 'Bearer abc' });
  check('CONTROL: sin SUPABASE_ANON_KEY corta con 503 en vez de degradar',
    r.estado === 503 && !r.siguiente, `estado=${r.estado} pasó=${r.siguiente}`);
  restaurar();

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
