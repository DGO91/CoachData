/**
 * test-supabase-client-contract.js
 * Verifica que todo el backend importa del módulo de Supabase símbolos que
 * ese módulo realmente exporta.
 *
 * Seis ficheros importaban `getSupabase`, que nunca ha existido: el módulo
 * exporta `getSupabaseClient`. Como la desestructuración de un símbolo ausente
 * no falla en el import sino al invocarlo, los tres handlers de automatización
 * de entregables y los servicios de backup y restauración reventaban con
 * TypeError en tiempo de ejecución, no al arrancar.
 *
 * Comprueba además que el módulo no devuelve clientes falsos: un objeto que
 * responde {data: null, error: null} convierte una base de datos mal
 * configurada en "no hay resultados", y hace pasar en verde cualquier prueba.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MODULO = 'src/backend/infrastructure/database/supabaseClient.js';

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// Lo que el módulo exporta de verdad, preguntándoselo a él.
const exportado = require(path.join(ROOT, MODULO));
const nombres = Object.keys(exportado);

check('CONTROL: el módulo de Supabase exporta algo',
  nombres.length > 0, 'no exporta nada — ¿se rompió el require?');

// Todos los símbolos que el backend importa de ese módulo deben existir.
const ficheros = execSync('git ls-files src/backend', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(f => f.endsWith('.js'));

const rotos = [];
let imports = 0;
for (const rel of ficheros) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const re = /const\s*\{([^}]+)\}\s*=\s*require\([^)]*supabaseClient['"]\)/g;
  let m;
  while ((m = re.exec(src))) {
    for (const raw of m[1].split(',')) {
      const sym = raw.split(':')[0].trim();
      if (!sym) continue;
      imports++;
      if (!nombres.includes(sym)) rotos.push(`${rel} importa '${sym}'`);
    }
  }
}

check('CONTROL: se encontraron imports que verificar',
  imports >= 20, `solo ${imports} imports detectados`);

check(`todos los símbolos importados existen (${imports} imports revisados)`,
  rotos.length === 0, `\n      ` + rotos.join('\n      '));

// El módulo no debe fabricar clientes falsos que simulen éxito sin datos.
const src = fs.readFileSync(path.join(ROOT, MODULO), 'utf8');
const sinComentarios = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check('el módulo no devuelve un cliente falso con {data: null, error: null}',
  !/data:\s*null\s*,\s*error:\s*null/.test(sinComentarios),
  'sigue habiendo un mock que simula consultas correctas sin base de datos');

console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
process.exit(failed === 0 ? 0 : 1);
