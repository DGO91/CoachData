/**
 * test-no-fake-data.js
 * Impide que vuelvan los datos inventados que se hacían pasar por reales.
 *
 * Todos compartían la misma forma: ante ausencia de configuración o de datos,
 * en lugar de fallar devolvían algo plausible —un plan de pago activo, una
 * factura pagada, un pago con status=success, un tenant con rol owner— sin
 * ninguna marca de ser ficticio. Una instancia rota era indistinguible de una
 * sana, y cualquier prueba pasaba en verde.
 *
 * Implementa la política NO_MOCK_DATA del repositorio como comprobación
 * ejecutable en vez de como documento.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// Los comentarios explican los mocks eliminados y por tanto los nombran.
const leer = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const billing = leer('src/backend/infrastructure/web/routes/billingRoutes.js');
const stripeSvc = leer('src/backend/services/stripeBillingService.js');
const tenantCtx = leer('src/backend/infrastructure/web/middlewares/tenantContextMiddleware.js');
const dbClient = leer('src/backend/infrastructure/database/supabaseClient.js');

// CONTROL POSITIVO: si una ruta estuviera mal, leeríamos cadenas vacías y todo
// pasaría por no encontrar nada que reprochar.
check('CONTROL: los ficheros analizados tienen contenido',
  [billing, stripeSvc, tenantCtx, dbClient].every(s => s.length > 400),
  'algún fichero se leyó vacío — ¿cambió alguna ruta?');

check('billing no inventa identificadores de Stripe',
  !/cus_mock|price_mock|sk_test_mock|dev_sess_/.test(billing + stripeSvc),
  'sigue habiendo un identificador de Stripe inventado');

check('billing no devuelve un plan de pago por defecto',
  !/plan:\s*['"]pro['"]/.test(billing),
  'sigue devolviendo plan pro sin respaldo en base de datos');

check('billing no devuelve facturas de ejemplo',
  !/INV-\d{4}-\d{3}|inv_001/.test(billing),
  'sigue devolviendo una factura inventada');

check('billing no sirve un PDF falso',
  !/%PDF-1\.\d/.test(billing),
  'sigue enviando bytes que simulan un PDF');

check('Stripe no simula pagos correctos ante un fallo de la pasarela',
  !/simulated=true|status=success&simulated|portal=dev_simulated/.test(stripeSvc),
  'sigue devolviendo una sesión o portal simulados');

check('el contexto de tenant no se inventa cuando falta la base de datos',
  !/role:\s*['"]owner['"]/.test(tenantCtx),
  'sigue concediendo rol owner sobre una organización inexistente');

check('el cliente de base de datos no simula consultas correctas sin conexión',
  !/data:\s*null\s*,\s*error:\s*null/.test(dbClient),
  'sigue devolviendo un cliente falso');

console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
process.exit(failed === 0 ? 0 : 1);
