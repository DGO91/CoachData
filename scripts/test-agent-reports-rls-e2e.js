/**
 * test-agent-reports-rls-e2e.js
 * La primera ruta migrada al cliente por petición, de extremo a extremo.
 *
 * Recorre el camino completo: HTTP → authMiddleware → tenantContextMiddleware →
 * userScopedClientMiddleware → consulta con el JWT del usuario → políticas de
 * Postgres. Es la prueba de que la migración sirve, y no sólo de que el cliente
 * se construye.
 *
 * Crea sus propios coaches y los borra al terminar.
 */
require('dotenv').config();
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { createApp } = require('../src/backend/infrastructure/web/app');


const { requiereServiceRole } = require('./lib/requiere-service-role');
if (requiereServiceRole('Escribe informes reales y comprueba el RLS que los protege.')) process.exit(0);

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

const marca = Date.now();
const CLAVE = `E2e-${marca}-Bz7!`;
const creados = { users: [], orgs: [] };

async function crearCoach(etq) {
  const email = `e2e-${etq}-${marca}@coachdata.test`;
  const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: CLAVE, email_confirm: true });
  if (eU) throw new Error(eU.message);
  creados.users.push(u.user.id);
  await admin.from('users').insert({ id: u.user.id, email, full_name: `E2E ${etq}` });
  const { data: org } = await admin.from('organizations')
    .insert({ name: `E2E ${etq} ${marca}`, slug: `e2e-${etq}-${marca}` }).select('id, slug').single();
  creados.orgs.push(org.id);
  await admin.from('organization_memberships').insert({ organization_id: org.id, user_id: u.user.id, role: 'owner' });
  const { data: s } = await anon.auth.signInWithPassword({ email, password: CLAVE });
  return { orgId: org.id, slug: org.slug, token: s.session.access_token };
}

async function limpiar() {
  if (creados.orgs.length) {
    await admin.from('agent_reports').delete().in('organization_id', creados.orgs);
    await admin.from('organization_memberships').delete().in('organization_id', creados.orgs);
    await admin.from('organizations').delete().in('id', creados.orgs);
  }
  if (creados.users.length) {
    await admin.from('users').delete().in('id', creados.users);
    for (const id of creados.users) await admin.auth.admin.deleteUser(id);
  }
}

(async () => {
  const server = createApp([]).listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;

  const pedir = (coach, path) => new Promise((res, rej) => {
    const r = http.get({
      hostname: '127.0.0.1', port, path,
      headers: { authorization: `Bearer ${coach.token}`, 'x-organization-slug': coach.slug },
    }, x => { let s = ''; x.on('data', c => s += c); x.on('end', () => res({ status: x.statusCode, body: s })); });
    r.on('error', rej);
  });

  try {
    const A = await crearCoach('a');
    const B = await crearCoach('b');

    await admin.from('agent_reports').insert({
      organization_id: A.orgId, agent_type: 'e2e_probe',
      title: 'Informe privado de A', content_markdown: 'contenido de A',
    });

    const rA = await pedir(A, '/api/agents/reports?agent_type=e2e_probe');
    const jA = JSON.parse(rA.body || '{}');
    check('CONTROL: el coach A recibe su informe por la API',
      rA.status === 200 && (jA.reports || []).length === 1,
      `status=${rA.status} filas=${(jA.reports || []).length}`);

    const rB = await pedir(B, '/api/agents/reports?agent_type=e2e_probe');
    const jB = JSON.parse(rB.body || '{}');
    check('el coach B no recibe el informe de A',
      (jB.reports || []).length === 0, `filas=${(jB.reports || []).length}`);

    // Con el slug de A en la cabecera, tenantContextMiddleware ya corta por
    // membresía: es la primera barrera, antes incluso de llegar a RLS.
    const rSuplantacion = await pedir({ token: B.token, slug: A.slug }, '/api/agents/reports?agent_type=e2e_probe');
    check('el coach B no puede pedir datos declarando la organización de A',
      rSuplantacion.status === 403, `status=${rSuplantacion.status}`);

    // Y sin sesión no se atiende.
    const sinSesion = await new Promise((res) => {
      http.get({ hostname: '127.0.0.1', port, path: '/api/agents/reports' }, x => {
        let s = ''; x.on('data', c => s += c); x.on('end', () => res({ status: x.statusCode }));
      });
    });
    check('sin sesión la ruta responde 401', sinSesion.status === 401, `status=${sinSesion.status}`);

  } catch (err) {
    console.log(`[FAIL] Error preparando la prueba — ${err.message}`);
    failed++;
  } finally {
    server.close();
    await limpiar();
    console.log('\n(coaches de prueba eliminados)');
  }

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
