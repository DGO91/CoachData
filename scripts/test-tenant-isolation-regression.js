/**
 * test-tenant-isolation-regression.js
 * Aislamiento multi-tenant real: RLS en la base y rechazo en el middleware.
 *
 * Mantiene las tres comprobaciones de la versión anterior:
 *   1. Control positivo — el coach A SÍ ve sus propios datos. Sin esto, un RLS
 *      que deniega a todo el mundo pasaría por seguro.
 *   2. Aislamiento — el coach B no ve ni una fila de A, con cliente anónimo y
 *      JWT real (nunca service_role: esa clave salta RLS por diseño).
 *   3. Rechazo HTTP — B declarando el slug de A recibe 403 de
 *      tenantContextMiddleware, antes incluso de llegar a la base.
 *
 * QUÉ CAMBIÓ Y POR QUÉ. La versión anterior obtenía sus JWT reescribiendo la
 * contraseña de dos cuentas reales a 'TestPassword123!' en cada ejecución:
 *
 *     await admin.auth.admin.updateUserById(userA_ID, { password: '...' })
 *
 * Una de ellas era la de una administradora del producto. Cada pasada del CI le
 * cambiaba la contraseña, y esa contraseña quedaba escrita en el repositorio.
 * La otra era un usuario de prueba marcado para borrado, así que el test estaba
 * además a punto de romperse solo.
 *
 * Ahora crea sus propios coaches, con contraseña aleatoria, y los borra al
 * terminar. No toca ninguna cuenta real y no depende de UUID escritos a mano.
 */
require('dotenv').config();
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { createApp } = require('../src/backend/infrastructure/web/app');


const { requiereServiceRole } = require('./lib/requiere-service-role');
if (requiereServiceRole('Crea inquilinos reales y comprueba que el RLS los separa.')) process.exit(0);

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY);

const marca = Date.now();
const CLAVE = `Iso-${marca}-${Math.random().toString(36).slice(2, 10)}!`;
const creados = { users: [], orgs: [] };

let fallos = 0;
const check = (nombre, ok, detalle) => {
  if (ok) console.log(`  [PASS] ${nombre}`);
  else { console.error(`  [FAIL] ${nombre} — ${detalle}`); fallos++; }
};

function pedir(port, path, headers) {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function crearCoach(etiqueta) {
  const email = `iso-${etiqueta}-${marca}@coachdata.test`;
  const { data: u, error: eU } = await admin.auth.admin.createUser({
    email, password: CLAVE, email_confirm: true,
  });
  if (eU) throw new Error(`No se pudo crear el usuario ${etiqueta}: ${eU.message}`);
  creados.users.push(u.user.id);

  await admin.from('users').insert({ id: u.user.id, email, full_name: `Aislamiento ${etiqueta}` });

  const { data: org, error: eO } = await admin.from('organizations')
    .insert({ name: `Aislamiento ${etiqueta} ${marca}`, slug: `iso-${etiqueta}-${marca}` })
    .select('id, slug').single();
  if (eO) throw new Error(`No se pudo crear la organización ${etiqueta}: ${eO.message}`);
  creados.orgs.push(org.id);

  await admin.from('organization_memberships')
    .insert({ organization_id: org.id, user_id: u.user.id, role: 'owner' });

  const { data: s, error: eS } = await anon.auth.signInWithPassword({ email, password: CLAVE });
  if (eS) throw new Error(`No se pudo iniciar sesión como ${etiqueta}: ${eS.message}`);

  return { userId: u.user.id, orgId: org.id, slug: org.slug, token: s.session.access_token };
}

// Cliente con la identidad del coach: es lo que hace que Postgres aplique las
// políticas. Con service_role no se probaría nada.
const clienteDe = (token) => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
  { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
);

async function limpiar() {
  if (creados.orgs.length) {
    for (const t of ['crm_contacts', 'crm_companies', 'organization_memberships']) {
      await admin.from(t).delete().in('organization_id', creados.orgs);
    }
    await admin.from('organizations').delete().in('id', creados.orgs);
  }
  if (creados.users.length) {
    await admin.from('users').delete().in('id', creados.users);
    for (const id of creados.users) await admin.auth.admin.deleteUser(id);
  }
}

(async () => {
  console.log('====================================================');
  console.log('AISLAMIENTO MULTI-TENANT — RLS REAL Y RECHAZO HTTP');
  console.log('====================================================');

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
    console.error('[FAIL] Falta configuración de Supabase en el entorno.');
    process.exit(1);
  }

  let server = null;
  try {
    const A = await crearCoach('a');
    const B = await crearCoach('b');
    console.log(`\n[Preparación] Coach A: ${A.slug}   Coach B: ${B.slug}`);

    // Un contacto que pertenece inequívocamente a A.
    const { error: eIns } = await admin.from('crm_contacts').insert({
      organization_id: A.orgId,
      first_name: 'Contacto', last_name: 'De A',
      email: `contacto-a-${marca}@coachdata.test`,
    });
    if (eIns) throw new Error(`No se pudo sembrar el contacto: ${eIns.message}`);

    const dbA = clienteDe(A.token);
    const dbB = clienteDe(B.token);

    console.log('\n1. CONTROL POSITIVO (el coach A consulta sus propios contactos):');
    const { data: veA, error: errA } = await dbA.from('crm_contacts').select('*');
    check('el coach A ve sus contactos', (veA || []).length > 0,
      `devolvió ${(veA || []).length} filas. ${errA?.message || ''}`);

    console.log('\n2. AISLAMIENTO RLS (el coach B consulta los contactos de A):');
    const { data: veB } = await dbB.from('crm_contacts').select('*');
    check('el coach B ve exactamente 0 filas', (veB || []).length === 0,
      `devolvió ${(veB || []).length} filas — fuga de datos`);

    const { data: forzado } = await dbB.from('crm_contacts').select('*').eq('organization_id', A.orgId);
    check('el coach B no las ve ni filtrando por la organización de A',
      (forzado || []).length === 0, `devolvió ${(forzado || []).length} filas`);

    console.log('\n3. RECHAZO HTTP (token de B declarando el slug de A):');
    server = createApp([]).listen(0);
    await new Promise(r => server.once('listening', r));
    const port = server.address().port;
    const cabeceras = { Authorization: `Bearer ${B.token}`, 'x-organization-slug': A.slug };

    for (const endpoint of ['/api/revenue/leads', '/api/billing/subscription', '/api/billing/invoices', '/api/organization/me']) {
      const res = await pedir(port, endpoint, cabeceras);
      check(`GET ${endpoint} responde 403`, res.status === 403,
        `respondió ${res.status}: ${res.body.slice(0, 80)}`);
    }

  } catch (err) {
    console.error(`  [FAIL] Error preparando la prueba — ${err.message}`);
    fallos++;
  } finally {
    if (server) server.close();
    await limpiar();
    console.log('\n[Limpieza] Coaches y organizaciones de prueba eliminados.');
  }

  console.log('\n----------------------------------------------------');
  console.log(fallos === 0
    ? 'RESULTADO: OK — aislamiento verificado en base de datos y en HTTP'
    : `RESULTADO: ${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
})();
