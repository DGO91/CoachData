/**
 * test-intelligence-tenant-isolation.js
 * Regresión: /api/intelligence/execute NO debe ejecutar agentes bajo un
 * organizationId por defecto.
 *
 * El fallo original: la ruta leía `req.organizationId`, que ningún middleware
 * asigna nunca, y caía a un UUID fijo. Todas las organizaciones ejecutaban
 * agentes bajo la misma identidad, y ExecutionPipeline repetía el mismo default
 * en su firma. Además `req.supabase` tampoco existe, así que la auditoría en
 * ai_agent_logs no llegaba a escribirse.
 *
 * Sigue las reglas de la skill e2e_testing: cada check tiene un camino de fallo
 * real y hay control positivo donde procede.
 */
require('dotenv').config();
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ROUTE = path.join(ROOT, 'src/backend/infrastructure/web/routes/intelligenceRoutes.js');
const PIPELINE = path.join(ROOT, 'src/backend/application/orchestrator/ExecutionPipeline.js');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// Los comentarios explican los fallos corregidos y por tanto NOMBRAN lo que
// estos checks prohíben. Analizamos solo el código ejecutable, o el propio
// comentario que documenta el arreglo haría fallar el test.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

(async () => {
  const routeSrc = stripComments(fs.readFileSync(ROUTE, 'utf8'));
  const pipeSrc = stripComments(fs.readFileSync(PIPELINE, 'utf8'));

  // 1 y 2. Ningún organizationId por defecto en el camino de ejecución.
  const FIXED_UUID = /['"]0{8}-0{4}-0{4}-0{4}-0{11}[0-9a-f]['"]/;
  check('la ruta no cae a un organizationId fijo',
    !FIXED_UUID.test(routeSrc), 'sigue habiendo un UUID literal en intelligenceRoutes.js');
  check('ExecutionPipeline no asume un organizationId por defecto',
    !FIXED_UUID.test(pipeSrc), 'sigue habiendo un UUID literal en ExecutionPipeline.js');

  // 3. La ruta debe resolver el tenant del contexto verificado, no de un campo inexistente.
  check('la ruta usa req.tenant (contexto verificado)',
    /req\.tenant/.test(routeSrc), 'no referencia req.tenant');
  check('la ruta ya no lee el inexistente req.organizationId',
    !/req\.organizationId/.test(routeSrc), 'sigue leyendo req.organizationId, que nadie asigna');

  // 4. Sin tenant resuelto, la ejecución debe cortarse.
  check('la ruta corta con 403 si no hay tenant',
    /403/.test(routeSrc), 'no hay corte por falta de contexto de organización');

  // 5. Comportamiento real: el pipeline debe rechazar una ejecución sin organización.
  const executionPipeline = require('../src/backend/application/orchestrator/ExecutionPipeline');
  let rejected = false;
  try {
    await executionPipeline.execute({ agentName: 'noexiste', input: {} });
  } catch (err) {
    rejected = /organizationId|organización|organization/i.test(err.message);
  }
  check('ExecutionPipeline.execute() sin organización lanza error',
    rejected, 'aceptó ejecutar sin saber de qué organización es');

  // 6. CONTROL POSITIVO: los ficheros que estamos leyendo existen y tienen
  //    contenido. Sin esto, un typo en la ruta haría pasar los checks de arriba
  //    por leer cadenas vacías.
  check('CONTROL: los ficheros analizados no están vacíos',
    routeSrc.length > 500 && pipeSrc.length > 500,
    `route=${routeSrc.length}B pipeline=${pipeSrc.length}B`);

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
