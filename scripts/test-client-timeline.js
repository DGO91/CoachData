/**
 * test-client-timeline.js
 *
 * Verifica GET /api/revenue/clients/timeline, el endpoint que alimenta la ficha
 * unificada del cliente (historial del pulpo).
 *
 * Estándar de la casa: controles positivos y negativos, contra el backend real
 * en :4000, con JWT de dos usuarios distintos. No se usa `service_role` para
 * consultar: esa clave se salta la RLS y el control de aislamiento pasaría
 * siempre, midiendo nada. El service_role solo se usa para sembrar y limpiar.
 *
 * Los dos usuarios son coaches efímeros creados al vuelo: antes se entraba con
 * las cuentas reales de los administradores y una contraseña fija escrita aquí.
 *
 * Los datos sembrados se borran al final, pase lo que pase.
 */

require('dotenv').config();
const { crearEntorno } = require('./lib/coaches-efimeros');

const BASE = process.env.TEST_API_BASE || 'http://localhost:4000';
const ENDPOINT = `${BASE}/api/revenue/clients/timeline`;

// Marca única: si algo falla a mitad, se sabe exactamente qué borrar.
const SELLO = `timeline-check-${Date.now()}`;
const EMAIL_PERSONA = `${SELLO}@example.com`;

let passed = true;
const ok = (m) => console.log(`  [PASS] ${m}`);
const fail = (m, extra) => { console.error(`  [FAIL] ${m}`, extra ?? ''); passed = false; };

const headers = (token, slug) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(slug ? { 'x-organization-slug': slug } : {}),
});

async function main() {
  console.log('====================================================');
  console.log('HISTORIAL UNIFICADO DEL CLIENTE — /clients/timeline');
  console.log('====================================================');

  try {
    await fetch(BASE, { signal: AbortSignal.timeout(4000) });
  } catch {
    console.error(`\n❌ El backend no responde en ${BASE}. Arráncalo con 'npm start'.\n`);
    process.exit(1);
  }

  const entorno = await crearEntorno(['a', 'b']);
  const admin = entorno.admin;
  const a = { ...entorno.coaches.a, orgId: entorno.coaches.a.organizationId };
  const b = { ...entorno.coaches.b, orgId: entorno.coaches.b.organizationId };
  console.log(`[Setup] A en '${a.slug}', B en '${b.slug}'.`);
  if (a.orgId === b.orgId) {
    console.error('[FATAL] Ambos usuarios comparten organización: el aislamiento no probaría nada.');
    await entorno.limpiar();
    process.exit(1);
  }

  // ── Siembra: la misma persona, con eventos en A y un evento en B ──────────
  // El evento de B usa el MISMO email a propósito: es la única forma de saber
  // si el endpoint filtra por organización o solo por correo.
  const semillas = [
    admin.from('canonical_form_entry').insert({
      organization_id: a.orgId, source_provider: 'tally', source_id: `${SELLO}-form`,
      respondent_email: EMAIL_PERSONA, respondent_name: 'Persona Prueba',
      form_name: 'Solicitud de sesión', answers: { presupuesto: 'alto' },
      occurred_at: '2026-08-01T10:00:00Z',
    }),
    admin.from('canonical_payment').insert({
      organization_id: a.orgId, source_provider: 'stripe', source_id: `${SELLO}-pay`,
      payer_email: EMAIL_PERSONA, payer_name: 'Persona Prueba',
      amount_cents: 45000, currency: 'eur', status: 'succeeded',
      occurred_at: '2026-08-03T10:00:00Z',
    }),
    admin.from('canonical_session').insert({
      organization_id: a.orgId, source_provider: 'calendly', source_id: `${SELLO}-ses`,
      attendee_email: EMAIL_PERSONA, attendee_name: 'Persona Prueba',
      session_type: 'Sesión de descubrimiento', starts_at: '2026-08-05T09:00:00Z',
      occurred_at: '2026-08-02T10:00:00Z',
    }),
    admin.from('canonical_payment').insert({
      organization_id: b.orgId, source_provider: 'stripe', source_id: `${SELLO}-pay-b`,
      payer_email: EMAIL_PERSONA, payer_name: 'Persona Prueba',
      amount_cents: 99900, currency: 'eur', status: 'succeeded',
      occurred_at: '2026-08-04T10:00:00Z',
    }),
  ];
  for (const s of semillas) {
    const { error } = await s;
    if (error) {
      console.error('[FATAL] No se pudo sembrar:', error.message);
      await entorno.limpiar();
      process.exit(1);
    }
  }
  console.log('[Setup] Sembrados 3 eventos en A y 1 en B, todos con el mismo email.\n');

  try {
    // ── 1. Sin token ────────────────────────────────────────────────────────
    console.log('1. SIN AUTENTICAR:');
    const anonRes = await fetch(`${ENDPOINT}?email=${EMAIL_PERSONA}`, { headers: headers(null, a.slug) });
    if (anonRes.status === 401 || anonRes.status === 403) ok(`Responde ${anonRes.status}.`);
    else fail('Se pudo leer el historial sin token. Status:', anonRes.status);

    // ── 2. Control positivo: A ve sus tres eventos ──────────────────────────
    console.log('\n2. LA FICHA REÚNE LAS TRES FUENTES:');
    const resA = await fetch(`${ENDPOINT}?email=${EMAIL_PERSONA}`, { headers: headers(a.token, a.slug) });
    const dataA = await resA.json();
    const eventos = dataA.timeline || dataA.events || [];
    const tipos = eventos.map((e) => e.type).sort();
    const proveedores = eventos.map((e) => e.source_provider).sort();

    if (resA.ok && eventos.length === 3 &&
        JSON.stringify(tipos) === JSON.stringify(['form_entry', 'payment', 'session'])) {
      ok(`3 eventos, uno por fuente: ${proveedores.join(', ')}.`);
    } else {
      fail(`Esperaba 3 eventos (formulario, pago, sesión). Recibí ${eventos.length}:`, tipos);
    }

    // ── 3. Orden cronológico ────────────────────────────────────────────────
    console.log('\n3. ORDEN CRONOLÓGICO:');
    const fechas = eventos.map((e) => new Date(e.occurred_at).getTime());
    const ordenadas = [...fechas].sort((x, y) => x - y);
    const inverso = [...ordenadas].reverse();
    if (fechas.length && (JSON.stringify(fechas) === JSON.stringify(ordenadas) ||
                          JSON.stringify(fechas) === JSON.stringify(inverso))) {
      ok('Los eventos llegan ordenados en el tiempo.');
    } else {
      fail('Los eventos no vienen ordenados:', eventos.map((e) => e.occurred_at));
    }

    // ── 4. Aislamiento: B no ve los eventos de A ────────────────────────────
    console.log('\n4. AISLAMIENTO ENTRE ORGANIZACIONES:');
    const resB = await fetch(`${ENDPOINT}?email=${EMAIL_PERSONA}`, { headers: headers(b.token, b.slug) });
    const dataB = await resB.json();
    const eventosB = dataB.timeline || dataB.events || [];
    // Control positivo primero: B tiene que ver SU evento, o el control de
    // abajo pasaría simplemente porque la consulta falló.
    if (!resB.ok) {
      fail('B no pudo leer ni su propio historial. Status:', resB.status);
    } else if (eventosB.length === 1 && eventosB[0].source_provider === 'stripe') {
      ok('B ve su único evento y ninguno de los de A, con el mismo email.');
    } else {
      fail(`FUGA o resultado inesperado: B recibió ${eventosB.length} eventos.`,
        eventosB.map((e) => e.type));
    }

    // ── 5. Persona sin rastro ───────────────────────────────────────────────
    console.log('\n5. PERSONA SIN EVENTOS:');
    const resVacio = await fetch(`${ENDPOINT}?email=nadie-${SELLO}@example.com`, { headers: headers(a.token, a.slug) });
    const dataVacio = await resVacio.json();
    const vacio = dataVacio.timeline || dataVacio.events || [];
    if (resVacio.ok && vacio.length === 0) ok('Devuelve una ficha vacía, no un error ni datos de ejemplo.');
    else fail('Respuesta inesperada para una persona sin eventos:', vacio.length);
  } finally {
    console.log('\n6. LIMPIEZA:');
    const borrados = await Promise.all([
      admin.from('canonical_form_entry').delete().eq('source_id', `${SELLO}-form`),
      admin.from('canonical_payment').delete().eq('source_id', `${SELLO}-pay`),
      admin.from('canonical_session').delete().eq('source_id', `${SELLO}-ses`),
      admin.from('canonical_payment').delete().eq('source_id', `${SELLO}-pay-b`),
    ]);
    if (borrados.some((r) => r.error)) {
      console.error('  [AVISO] Quedaron datos sin borrar con el sello', SELLO);
      passed = false;
    } else {
      console.log('  Datos de prueba eliminados.');
    }
    await entorno.limpiar();
    console.log('  Coaches efímeros retirados.');
  }

  console.log('\n----------------------------------------------------');
  console.log(`VEREDICTO: ${passed ? 'TODOS LOS CONTROLES PASAN — PASS' : 'FAILED'}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => { console.error('\n[FATAL]', err.message); process.exit(1); });
