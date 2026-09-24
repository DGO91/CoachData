/**
 * test-rls-user-scoped.js
 * ¿Protege RLS de verdad cuando se consulta con el JWT del usuario?
 *
 * Es la prueba que decide si el cliente por petición sirve para algo. Con
 * service_role no probaría nada: esa clave salta RLS por diseño y todo pasaría.
 *
 * Crea sus propios usuarios y organizaciones, y los borra al terminar. El test
 * que ya existía en el repositorio obtiene sus JWT cambiando la contraseña de
 * cuentas reales —entre ellas la de una administradora— en cada ejecución; eso
 * no se repite aquí.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { crearClienteDeUsuario } = require('../src/backend/infrastructure/database/userScopedClient');

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

const marca = Date.now();
const CLAVE = `Rls-${marca}-Ax9!`;
const creados = { users: [], orgs: [] };

async function crearCoach(etiqueta) {
  const email = `rls-test-${etiqueta}-${marca}@coachdata.test`;
  const { data: u, error: eU } = await admin.auth.admin.createUser({
    email, password: CLAVE, email_confirm: true,
  });
  if (eU) throw new Error(`No se pudo crear el usuario ${etiqueta}: ${eU.message}`);
  creados.users.push(u.user.id);

  await admin.from('users').insert({ id: u.user.id, email, full_name: `RLS ${etiqueta}` });

  const { data: org, error: eO } = await admin.from('organizations')
    .insert({ name: `RLS Test ${etiqueta} ${marca}`, slug: `rls-${etiqueta}-${marca}` })
    .select('id, slug').single();
  if (eO) throw new Error(`No se pudo crear la organización ${etiqueta}: ${eO.message}`);
  creados.orgs.push(org.id);

  await admin.from('organization_memberships')
    .insert({ organization_id: org.id, user_id: u.user.id, role: 'owner' });

  const { data: sesion, error: eS } = await anon.auth.signInWithPassword({ email, password: CLAVE });
  if (eS) throw new Error(`No se pudo iniciar sesión como ${etiqueta}: ${eS.message}`);

  return { userId: u.user.id, orgId: org.id, token: sesion.session.access_token };
}

async function limpiar() {
  for (const t of ['agent_reports', 'organization_memberships']) {
    if (creados.orgs.length) await admin.from(t).delete().in('organization_id', creados.orgs);
  }
  if (creados.orgs.length) await admin.from('organizations').delete().in('id', creados.orgs);
  if (creados.users.length) await admin.from('users').delete().in('id', creados.users);
  for (const id of creados.users) await admin.auth.admin.deleteUser(id);
}

(async () => {
  let A, B;
  try {
    A = await crearCoach('a');
    B = await crearCoach('b');
    console.log(`Coach A: org ${A.orgId.slice(0, 8)}…   Coach B: org ${B.orgId.slice(0, 8)}…\n`);

    // Un dato que pertenece inequívocamente a A.
    const { error: eIns } = await admin.from('agent_reports').insert({
      organization_id: A.orgId,
      agent_type: 'rls_probe',
      title: 'Secreto de A',
      content_markdown: 'Sólo A debería poder leer esto.',
    });
    if (eIns) throw new Error(`No se pudo sembrar el dato: ${eIns.message}`);

    const dbA = crearClienteDeUsuario(A.token);
    const dbB = crearClienteDeUsuario(B.token);

    // CONTROL POSITIVO: A ve lo suyo. Sin esto, un RLS que bloqueara a todo el
    // mundo pasaría la prueba de aislamiento sin proteger nada útil.
    const { data: veA } = await dbA.from('agent_reports').select('*').eq('agent_type', 'rls_probe');
    check('CONTROL: el coach A ve su propio reporte', (veA || []).length === 1, `filas=${(veA || []).length}`);

    // LA PRUEBA: B no ve el dato de A, aunque pregunte por él sin ningún filtro.
    const { data: veB } = await dbB.from('agent_reports').select('*').eq('agent_type', 'rls_probe');
    check('el coach B NO ve el reporte de A', (veB || []).length === 0, `filas=${(veB || []).length}`);

    // Ni forzando el organization_id ajeno en la consulta.
    const { data: forzado } = await dbB.from('agent_reports').select('*').eq('organization_id', A.orgId);
    check('el coach B no lo ve ni filtrando por la organización de A',
      (forzado || []).length === 0, `filas=${(forzado || []).length}`);

    // Tampoco puede escribir en la organización de A.
    const { error: eEscritura } = await dbB.from('agent_reports').insert({
      organization_id: A.orgId, agent_type: 'rls_probe', title: 'Intruso', content_markdown: 'x',
    });
    check('el coach B no puede escribir en la organización de A', !!eEscritura,
      'la escritura fue aceptada');

    // Las organizaciones también están cubiertas.
    const { data: orgsB } = await dbB.from('organizations').select('id');
    const veOrgA = (orgsB || []).some(o => o.id === A.orgId);
    check('el coach B no ve la organización de A en el listado', !veOrgA,
      `ve ${(orgsB || []).length} organizaciones`);

    // Y CONTROL: service_role sí lo ve, que es lo que demuestra que el dato
    // existe y que la diferencia la marca RLS, no una base vacía.
    const { data: veAdmin } = await admin.from('agent_reports').select('*').eq('agent_type', 'rls_probe');
    check('CONTROL: service_role sí ve el dato (RLS es la diferencia)',
      (veAdmin || []).length >= 1, `filas=${(veAdmin || []).length}`);

  } catch (err) {
    console.log(`[FAIL] Error preparando la prueba — ${err.message}`);
    failed++;
  } finally {
    await limpiar();
    console.log('\n(usuarios y organizaciones de prueba eliminados)');
  }

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
