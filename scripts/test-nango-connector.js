/**
 * test-nango-connector.js
 *
 * Verifica el lector por Nango: la pieza que hace que una herramienta
 * autorizada por OAuth traiga de verdad sus datos al modelo canónico.
 *
 * No necesita credenciales ni red para los controles de mapeo: se le da una
 * respuesta real de HubSpot y se comprueba en qué se convierte. La llamada de
 * red se sustituye por un doble, para que la suite pueda fallar por el motivo
 * correcto y no por no tener una cuenta conectada delante.
 */

require('dotenv').config();
const { NangoConnector } = require('../src/backend/modules/integrations/infrastructure/connectors/NangoConnector');

const ORG = '00000000-0000-4000-a000-00000000beef';
let passed = true;
const ok = (m) => console.log(`  [PASS] ${m}`);
const fail = (m, extra) => { console.error(`  [FAIL] ${m}`, extra ?? ''); passed = false; };

// Respuesta tal cual la devuelve la API de contactos de HubSpot.
const RESPUESTA_HUBSPOT = {
  results: [
    {
      id: '701',
      properties: {
        email: 'Marta@Ejemplo.com',
        firstname: 'Marta',
        lastname: 'Ruiz',
        phone: '+34600111222',
        createdate: '2026-08-10T09:00:00.000Z',
      },
    },
    {
      // Sin email: no hay forma de cruzarlo con el resto del pulpo.
      id: '702',
      properties: { firstname: 'Sin', lastname: 'Correo', createdate: '2026-08-11T09:00:00.000Z' },
    },
    {
      // Anterior a la fecha pedida: no debe entrar.
      id: '703',
      properties: { email: 'viejo@ejemplo.com', firstname: 'Muy', lastname: 'Antiguo', createdate: '2020-01-01T00:00:00.000Z' },
    },
  ],
  paging: {},
};

function conRespuesta(cuerpo, ok = true, status = 200) {
  return async () => ({ ok, status, json: async () => cuerpo });
}

async function main() {
  console.log('====================================================');
  console.log('LECTOR POR NANGO — de la herramienta al canónico');
  console.log('====================================================\n');

  const fetchOriginal = global.fetch;
  const conector = new NangoConnector('hubspot');
  const credenciales = { hubspot: 'conexion-de-prueba' };
  const desde = new Date('2026-08-01T00:00:00Z');

  try {
    // ── 1. Proveedor desconocido ────────────────────────────────────────────
    console.log('1. PROVEEDOR NO SOPORTADO:');
    try {
      new NangoConnector('herramienta-que-no-existe');
      fail('Se creó un conector para un proveedor que no está en el catálogo.');
    } catch (err) {
      if (err.message.includes('no soportado')) ok('Falla al construirlo, no al usarlo.');
      else fail('Falló, pero por otro motivo:', err.message);
    }

    // ── 2. Sin conexión guardada ────────────────────────────────────────────
    console.log('\n2. HERRAMIENTA SIN CONECTAR:');
    global.fetch = conRespuesta(RESPUESTA_HUBSPOT);
    const sinConexion = await conector.backfill({}, desde, ORG);
    if (sinConexion.length === 0) ok('Devuelve cero eventos: no inventa datos de una herramienta sin conectar.');
    else fail(`Devolvió ${sinConexion.length} eventos sin ninguna conexión guardada.`);

    // ── 3. Mapeo al modelo canónico ─────────────────────────────────────────
    console.log('\n3. TRADUCCIÓN AL CANÓNICO:');
    global.fetch = conRespuesta(RESPUESTA_HUBSPOT);
    const eventos = await conector.backfill(credenciales, desde, ORG);

    if (eventos.length !== 1) {
      fail(`Esperaba 1 evento (uno con email y dentro de fecha). Recibí ${eventos.length}.`,
        eventos.map((e) => e.sourceId));
    } else {
      const e = eventos[0];
      const correcto =
        e.entityType === 'contact' &&
        e.organizationId === ORG &&
        e.sourceProvider === 'hubspot' &&
        e.sourceId === 'hubspot_contact_701' &&
        e.fields.email === 'marta@ejemplo.com' &&      // normalizado a minúsculas
        e.fields.full_name === 'Marta Ruiz' &&
        e.fields.phone === '+34600111222';
      if (correcto) ok('Contacto traducido con email normalizado, nombre y teléfono.');
      else fail('El mapeo no coincide:', JSON.stringify(e.fields));
    }

    // ── 4. Descartes: sin email y fuera de fecha ────────────────────────────
    console.log('\n4. LO QUE NO DEBE ENTRAR:');
    const ids = eventos.map((e) => e.sourceId);
    const colado702 = ids.includes('hubspot_contact_702');
    const colado703 = ids.includes('hubspot_contact_703');
    if (!colado702 && !colado703) {
      ok('Fuera el contacto sin email y el anterior a la fecha pedida.');
    } else {
      fail('Se colaron registros que debían descartarse:', { sinEmail: colado702, viejo: colado703 });
    }

    // ── 5. La herramienta responde con error ────────────────────────────────
    console.log('\n5. LA HERRAMIENTA FALLA:');
    global.fetch = conRespuesta({ error: { message: 'token caducado' } }, false, 401);
    try {
      await conector.backfill(credenciales, desde, ORG);
      fail('Un 401 de la herramienta se tragó en silencio y devolvió normalidad.');
    } catch (err) {
      if (err.message.includes('token caducado')) ok('Propaga el motivo real, no un error genérico.');
      else fail('Lanzó, pero perdiendo el motivo:', err.message);
    }

    // ── 6. Firma de webhook: falla cerrado ──────────────────────────────────
    console.log('\n6. FIRMA DE WEBHOOK:');
    try {
      conector.verifySignature(Buffer.from('{}'), {}, 'secreto');
      fail('verifySignature aceptó sin poder verificar nada.');
    } catch {
      ok('Falla cerrado: sin verificación, no se acepta el webhook.');
    }
  } finally {
    global.fetch = fetchOriginal;
  }

  console.log('\n----------------------------------------------------');
  console.log(`VEREDICTO: ${passed ? 'TODOS LOS CONTROLES PASAN — PASS' : 'FAILED'}`);
  process.exit(passed ? 0 : 1);
}

main().catch((err) => { console.error('\n[FATAL]', err.message); process.exit(1); });
