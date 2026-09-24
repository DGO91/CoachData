/**
 * test-onboarding-pack.js
 * Puesta en marcha de un cliente nuevo sin tocar código.
 *
 * La puerta de la fase 05 es poder implantar un coach en un rato. Eso exige dos
 * cosas que hasta ahora no existían: saber qué le falta conectar, y dejarle la
 * configuración de su sector ya cargada.
 *
 * El pack de business coach estaba escrito desde hacía tiempo como un objeto de
 * valores por defecto que no invocaba nadie: cada organización nacía sin criterio
 * de calificación de leads y sin horarios de agentes.
 */
require('dotenv').config();
const http = require('http');

const { requiereServiceRole } = require('./lib/requiere-service-role');
if (requiereServiceRole('Da de alta una organizacion nueva de verdad.')) process.exit(0);

const { crearEntorno } = require('./lib/coaches-efimeros');
const { createApp } = require('../src/backend/infrastructure/web/app');

let failed = 0;
const check = (n, ok, d) => { if (ok) console.log(`[PASS] ${n}`); else { console.log(`[FAIL] ${n} — ${d}`); failed++; } };

(async () => {
  const ent = await crearEntorno(['coach']);
  const server = createApp([]).listen(0);
  await new Promise(r => server.once('listening', r));
  const port = server.address().port;
  const c = ent.coaches.coach;

  const pedir = (path, method = 'GET', body = null) => new Promise((resolve, reject) => {
    const d = body ? JSON.stringify(body) : null;
    const r = http.request({ hostname: '127.0.0.1', port, path, method,
      headers: { authorization: `Bearer ${c.token}`, 'x-organization-slug': c.slug,
        ...(d ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) } : {}) } },
      x => { let s = ''; x.on('data', k => s += k); x.on('end', () => resolve({ status: x.statusCode, ctype: x.headers['content-type'] || '', body: s })); });
    r.on('error', reject); if (d) r.write(d); r.end();
  });

  try {
    // 1. Un cliente recién creado no tiene nada conectado, y el estado lo dice.
    const e1 = await pedir('/api/onboarding/estado');
    const j1 = JSON.parse(e1.body || '{}');
    check('el estado responde JSON', e1.ctype.includes('application/json'), `ctype=${e1.ctype}`);
    check('un cliente nuevo empieza al 0% conectado', j1.completado === 0, `completado=${j1.completado}`);
    check('sin pack aplicado de salida', j1.packAplicado === false, `packAplicado=${j1.packAplicado}`);

    // Lo importante no es la lista, es que diga UNA cosa que hacer ahora.
    check('indica un único siguiente paso', !!j1.siguiente && !!j1.siguiente.titulo,
      JSON.stringify(j1.siguiente));
    check('el siguiente paso explica para qué sirve', !!j1.siguiente?.porque, 'sin motivo');

    // 2. Aplicar el pack deja al coach configurado.
    const ap = await pedir('/api/onboarding/aplicar-pack', 'POST', { sector: 'business_coach_consulting' });
    const ja = JSON.parse(ap.body || '{}');
    check('el pack se aplica', ap.status === 200 && ja.success, `status=${ap.status} ${ap.body.slice(0, 80)}`);
    check('crea el criterio de calificación de leads', ja.scoring === 'creado', `scoring=${ja.scoring}`);
    check('programa los agentes del sector', ja.agentes >= 4, `agentes=${ja.agentes}`);

    // 3. Los datos están de verdad en la base, no sólo en la respuesta.
    const { data: scoring } = await ent.admin.from('lead_scoring_config')
      .select('umbral_alto, umbral_medio, activo').eq('organization_id', c.organizationId).maybeSingle();
    check('el criterio queda guardado y activo',
      scoring?.activo === true && scoring.umbral_alto > scoring.umbral_medio,
      JSON.stringify(scoring));

    const { data: agentes } = await ent.admin.from('agent_schedules')
      .select('agent_type, is_active').eq('organization_id', c.organizationId);
    check('quedan agentes programados', (agentes || []).length >= 4, `${(agentes || []).length} agentes`);
    check('no se encienden todos de salida',
      (agentes || []).some(a => a.is_active === false),
      'todos activos: el buzón se llenaría el primer día');

    // 4. Aplicarlo dos veces no duplica ni pisa lo que el coach haya cambiado.
    await ent.admin.from('lead_scoring_config')
      .update({ umbral_alto: 95 }).eq('organization_id', c.organizationId);
    const ap2 = await pedir('/api/onboarding/aplicar-pack', 'POST', {});
    const ja2 = JSON.parse(ap2.body || '{}');
    check('reaplicarlo no vuelve a crear el criterio', ja2.scoring === 'sin cambios', `scoring=${ja2.scoring}`);
    check('reaplicarlo no añade agentes repetidos', ja2.agentes === 0, `agentes=${ja2.agentes}`);

    const { data: tras } = await ent.admin.from('lead_scoring_config')
      .select('umbral_alto').eq('organization_id', c.organizationId).maybeSingle();
    check('respeta lo que el coach cambió a mano', tras?.umbral_alto === 95, `umbral=${tras?.umbral_alto}`);

    const { count } = await ent.admin.from('agent_schedules')
      .select('*', { count: 'exact', head: true }).eq('organization_id', c.organizationId);
    check('CONTROL: no se duplicaron horarios', count === (agentes || []).length, `${count} vs ${(agentes || []).length}`);

    // 5. Un sector inventado se rechaza en vez de aplicar valores al azar.
    const malo = await pedir('/api/onboarding/aplicar-pack', 'POST', { sector: 'no_existe' });
    check('un sector desconocido se rechaza con 400', malo.status === 400, `status=${malo.status}`);

  } catch (err) {
    console.log(`[FAIL] Error durante la prueba — ${err.message}`);
    failed++;
  } finally {
    server.close();
    for (const t of ['lead_scoring_config', 'agent_schedules']) {
      await ent.admin.from(t).delete().eq('organization_id', c.organizationId);
    }
    await ent.limpiar();
  }

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
