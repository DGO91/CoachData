/**
 * test-platform-admin.js
 * El panel de la agencia y quién puede verlo.
 *
 * Es la única superficie que mira por encima de la organización: enseña datos de
 * todos los clientes a la vez. Un fallo aquí no filtra una organización, las
 * filtra todas, así que el guardián se prueba antes que el contenido.
 */
require('dotenv').config();
const path = require('path');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

const RUTA = path.resolve(__dirname, '../src/backend/infrastructure/web/middlewares/requirePlatformAdmin.js');
function cargar(lista) {
  if (lista === null) delete process.env.PLATFORM_ADMIN_USER_IDS;
  else process.env.PLATFORM_ADMIN_USER_IDS = lista;
  delete require.cache[RUTA];
  return require(RUTA).requirePlatformAdmin;
}

function ejecutar(mw, user) {
  let estado = null, cuerpo = null, siguiente = false;
  const res = {
    status(c) { estado = c; return res; },
    json(b) { cuerpo = b; return res; },
  };
  mw({ user }, res, () => { siguiente = true; });
  return { estado, cuerpo, siguiente };
}

// Identificadores ficticios: este test prueba la lógica del guardián, no una
// cuenta concreta. Usar el UUID de un administrador real acoplaba el test a que
// esa persona siguiera existiendo.
const ADMIN = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OTRO  = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

(async () => {
  // 1. Sin lista configurada NO se abre a nadie. Un valor por omisión permisivo
  //    convertiría un despiste de configuración en acceso a todos los clientes.
  let mw = cargar(null);
  let r = ejecutar(mw, { id: ADMIN });
  check('sin PLATFORM_ADMIN_USER_IDS se deniega a todos',
    r.estado === 403 && !r.siguiente, `estado=${r.estado} pasó=${r.siguiente}`);

  // 2. Con lista vacía, igual.
  mw = cargar('');
  r = ejecutar(mw, { id: ADMIN });
  check('con la lista vacía también se deniega', r.estado === 403 && !r.siguiente, `estado=${r.estado}`);

  // 3. Un id de la lista pasa.
  mw = cargar(ADMIN);
  r = ejecutar(mw, { id: ADMIN });
  check('un administrador de plataforma pasa', r.siguiente === true, `estado=${r.estado}`);

  // 4. CONTROL: uno que no está en la lista no pasa. Sin esto, un middleware que
  //    dejara pasar a todo el mundo superaría la comprobación anterior.
  r = ejecutar(mw, { id: OTRO });
  check('CONTROL: un usuario ajeno a la lista se rechaza',
    r.estado === 403 && !r.siguiente, `estado=${r.estado} pasó=${r.siguiente}`);

  // 5. Sin sesión, 401 y no 403: son cosas distintas y el cliente las trata
  //    distinto — una pide iniciar sesión, la otra no.
  r = ejecutar(mw, undefined);
  check('sin sesión responde 401', r.estado === 401 && !r.siguiente, `estado=${r.estado}`);

  // 6. Varios administradores separados por comas, con espacios de más.
  mw = cargar(` ${OTRO} , ${ADMIN} `);
  check('acepta varios ids con espacios sobrantes',
    ejecutar(mw, { id: ADMIN }).siguiente && ejecutar(mw, { id: OTRO }).siguiente,
    'alguno de los dos no pasó');

  // 7. El resumen se compone sin reventar y ordena por problemas.
  process.env.PLATFORM_ADMIN_USER_IDS = ADMIN;
  const router = require('../src/backend/infrastructure/web/routes/platformRoutes');
  const capa = router.stack.find(c => c.route?.path === '/overview');
  check('CONTROL: la ruta /overview está declarada', !!capa, 'no se encontró la capa');

  // Las comprobaciones de AUTORIZACIÓN de arriba no tocan la base y corren
  // siempre. Las tres de abajo sí: el resumen mira POR ENCIMA de todas las
  // organizaciones, así que ejecuta get_auth_user_organizations(), y la
  // migración 030 revocó ese permiso a PUBLIC. Con la clave publicable responde
  // "permission denied": no es un fallo, es que en CI no hay clave de servicio.
  if (capa && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('[SKIP] El resumen de clientes se omite: falta SUPABASE_SERVICE_ROLE_KEY.');
    console.log('       Consulta por encima de todas las organizaciones y la 030');
    console.log('       revocó ese permiso a PUBLIC. Corre en local, no en CI.');
    console.log('       Las comprobaciones de autorización SÍ se han ejecutado.');
  } else if (capa) {
    const resultado = await new Promise((resolve) => {
      const res = { status: () => res, json: (b) => resolve(b) };
      capa.route.stack[0].handle({ tenant: null, user: { id: ADMIN } }, res, () => {});
    });

    const filas = Array.isArray(resultado.clientes) ? resultado.clientes : null;
    check('el resumen devuelve una fila por organización',
      filas !== null && filas.length > 0,
      JSON.stringify(resultado).slice(0, 120));

    // Guardas explícitas: sin ellas, un resumen que llega vacío revienta con un
    // TypeError y el registro del CI enseña una traza de pila en lugar del
    // [FAIL] que explica qué pasó. Un test que se cae no informa: asusta.
    check('cada fila trae el estado de integraciones y agentes',
      filas !== null && filas.every(c => c.integraciones && c.agentes24h),
      filas === null ? 'no llegaron filas' : 'falta alguna sección en las filas');
    check('las filas vienen ordenadas por problemas, de más a menos',
      filas !== null && filas.every((c, i, a) => i === 0 || a[i - 1].problemas >= c.problemas),
      filas === null ? 'no llegaron filas' : filas.map(c => c.problemas).join(','));
  }

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
