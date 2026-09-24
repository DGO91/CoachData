/**
 * test-lead-scoring-config-api.js
 *
 * Verifica el contrato que consume la pantalla «Criterio de calificación»
 * (LeadScoringCriteria.jsx): GET/PUT /api/revenue/lead-scoring-config.
 *
 * Controles positivos y negativos, contra el backend real en :4000 y con JWT
 * de usuario real (no service_role: eso saltaría la RLS y el aislamiento
 * pasaría siempre).
 *
 * Los dos usuarios son coaches efímeros creados al vuelo. Antes se entraba con
 * las cuentas reales de los administradores y una contraseña fija escrita aquí,
 * lo que obligaba además a guardar y restaurar su configuración: sobre una
 * organización que se destruye al terminar, eso ya no hace falta.
 */

require('dotenv').config();
const { crearEntorno } = require('./lib/coaches-efimeros');

const BASE = process.env.TEST_API_BASE || 'http://localhost:4000';
const ENDPOINT = `${BASE}/api/revenue/lead-scoring-config`;

let passed = true;
function ok(msg) { console.log(`  [PASS] ${msg}`); }
function fail(msg, extra) {
  console.error(`  [FAIL] ${msg}`, extra !== undefined ? extra : '');
  passed = false;
}

function headers(token, slug) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(slug ? { 'x-organization-slug': slug } : {}),
  };
}

async function main() {
  console.log('====================================================');
  console.log('CONTRATO DE /api/revenue/lead-scoring-config');
  console.log('====================================================');

  // Comprobación previa: sin backend en pie, este script no prueba nada.
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(4000) });
  } catch {
    console.error(`\n❌ El backend no responde en ${BASE}. Arráncalo con 'npm start'.\n`);
    process.exit(1);
  }

  const entorno = await crearEntorno(['a', 'b']);
  const { token: tokenA, slug: slugA } = entorno.coaches.a;
  const { token: tokenB, slug: slugB } = entorno.coaches.b;
  console.log(`[Setup] Usuario A en '${slugA}', usuario B en '${slugB}', ambos con JWT real.`);
  if (slugA === slugB) {
    console.error('[FATAL] Los dos usuarios comparten organización: el control de aislamiento no probaría nada.');
    await entorno.limpiar();
    process.exit(1);
  }

  // Una organización recién creada puede no tener fila de configuración. Se deja
  // a las dos en un estado conocido para que los controles de abajo midan el
  // contrato y no el azar de lo que hubiera antes.
  const base = {
    criterio_texto: 'Criterio de partida',
    senales: { presupuesto_alto: 50, urgencia: 50 },
    umbral_alto: 70,
    umbral_medio: 40,
    activo: true,
  };
  for (const [t, sl] of [[tokenA, slugA], [tokenB, slugB]]) {
    const r = await fetch(ENDPOINT, { method: 'PUT', headers: headers(t, sl), body: JSON.stringify(base) });
    if (!r.ok) {
      console.error(`[FATAL] No se pudo dejar '${sl}' en el estado de partida. Status: ${r.status}`);
      await entorno.limpiar();
      process.exit(1);
    }
  }
  console.log('');

  try {
    // ── 1. Control negativo: sin token no se lee nada ────────────────────────
    console.log('1. SIN AUTENTICAR:');
    const anonRes = await fetch(ENDPOINT, { headers: headers(null, slugA) });
    if (anonRes.status === 401 || anonRes.status === 403) {
      ok(`La lectura sin token responde ${anonRes.status}.`);
    } else {
      fail('Se pudo leer el criterio sin autenticación. Status:', anonRes.status);
    }

    // ── 2. GET devuelve la forma que la pantalla espera ──────────────────────
    console.log('\n2. LECTURA CON JWT REAL:');
    const getRes = await fetch(ENDPOINT, { headers: headers(tokenA, slugA) });
    const config = await getRes.json();
    const campos = ['criterio_texto', 'senales', 'umbral_alto', 'umbral_medio', 'activo'];
    const faltan = campos.filter((c) => !(c in config));
    if (getRes.ok && faltan.length === 0) {
      ok('Devuelve los 5 campos que la pantalla pinta.');
    } else {
      fail('Respuesta incompleta. Faltan:', faltan);
    }

    // ── 3. PUT guarda de verdad y GET lo confirma ────────────────────────────
    console.log('\n3. GUARDADO Y PERSISTENCIA:');
    const marca = `Criterio de verificación ${Date.now()}`;
    const cuerpo = {
      criterio_texto: marca,
      senales: { presupuesto_alto: 60, urgencia: 40 },
      umbral_alto: 75,
      umbral_medio: 45,
      activo: true,
    };
    const putRes = await fetch(ENDPOINT, {
      method: 'PUT', headers: headers(tokenA, slugA), body: JSON.stringify(cuerpo),
    });
    const guardado = await putRes.json();

    const releido = await (await fetch(ENDPOINT, { headers: headers(tokenA, slugA) })).json();
    const coincide =
      releido.criterio_texto === marca &&
      releido.umbral_alto === 75 &&
      releido.umbral_medio === 45 &&
      releido.senales?.presupuesto_alto === 60 &&
      releido.senales?.urgencia === 40;

    if (putRes.ok && guardado.success && coincide) {
      ok('Lo guardado se relee idéntico, señales incluidas.');
    } else {
      fail('El criterio no persistió como se envió:', releido);
    }

    // ── 4. Aislamiento: B no ve el criterio de A ─────────────────────────────
    console.log('\n4. AISLAMIENTO ENTRE ORGANIZACIONES:');
    // Control positivo: B lee su propia organización sin error. Si esto fallara,
    // el control siguiente pasaría por el motivo equivocado.
    const deBres = await fetch(ENDPOINT, { headers: headers(tokenB, slugB) });
    const deB = await deBres.json();
    if (deBres.ok && deB.criterio_texto !== marca) {
      ok('B lee su propia organización y no ve el criterio de A.');
    } else if (!deBres.ok) {
      fail('B no pudo leer ni su propia configuración. Status:', deBres.status);
    } else {
      fail('FUGA: el usuario B leyó el criterio de la organización A.');
    }

    // Control negativo: B pide explícitamente el slug de A.
    const cruzadoRes = await fetch(ENDPOINT, { headers: headers(tokenB, slugA) });
    const cruzado = await cruzadoRes.json();
    if (!cruzadoRes.ok) {
      ok(`Pedir la organización ajena por slug se rechaza con ${cruzadoRes.status}.`);
    } else if (cruzado.criterio_texto === marca) {
      fail('FUGA GRAVE: con el slug de A, el usuario B leyó su criterio.');
    } else {
      fail('El acceso cruzado no se rechazó, aunque no devolvió el criterio de A:', cruzado);
    }

    // ── 5. El interruptor apagado se persiste ────────────────────────────────
    console.log('\n5. CALIFICACIÓN DESACTIVADA:');
    await fetch(ENDPOINT, {
      method: 'PUT', headers: headers(tokenA, slugA),
      body: JSON.stringify({ ...cuerpo, activo: false }),
    });
    const apagado = await (await fetch(ENDPOINT, { headers: headers(tokenA, slugA) })).json();
    if (apagado.activo === false) {
      ok('El interruptor apagado se guarda (el calificador lo respeta y no puntúa).');
    } else {
      fail('activo=false no se persistió. Valor leído:', apagado.activo);
    }
  } finally {
    // ── 6. Retirada ─────────────────────────────────────────────────────────
    console.log('\n6. LIMPIEZA:');
    await entorno.limpiar();
    console.log('  Coaches efímeros y sus organizaciones retirados.');
  }

  console.log('\n----------------------------------------------------');
  console.log(`VEREDICTO: ${passed ? 'TODOS LOS CONTROLES PASAN — PASS' : 'FAILED'}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
