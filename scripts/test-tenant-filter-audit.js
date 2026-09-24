/**
 * test-tenant-filter-audit.js
 * Barre todas las consultas .from() del backend y exige que las que tocan una
 * tabla multi-tenant filtren por organización.
 *
 * La lista de tablas NO está escrita a mano: se deriva de supabase/migrations/,
 * así que una tabla nueva con organization_id entra sola en el barrido. Si se
 * mantuviera a mano, el día que alguien añada una tabla el test seguiría en
 * verde sin cubrirla.
 *
 * Las excepciones se declaran una a una, con su motivo. Cualquier consulta sin
 * filtro que no esté en esa lista rompe el test.
 *
 * Hay dos formas de declarar una excepción:
 *
 *   1. EXCEPCIONES, abajo. Exime el FICHERO ENTERO. Sirve cuando ninguna
 *      consulta del archivo puede filtrar (un buzón de webhooks, por ejemplo).
 *
 *   2. Un marcador en las líneas de comentario justo encima de la consulta:
 *        // audit-tenant-filter: exento — <razón>
 *      Exime SOLO esa consulta. Es la preferible: la razón queda pegada al
 *      código que la necesita, y las demás consultas del archivo siguen
 *      vigiladas. Eximir un fichero de seis consultas para justificar una deja
 *      las otras cinco sin cubrir el día que alguien les quite el filtro.
 *
 * El marcador exige una razón después del guión largo. Un marcador vacío no
 * exime: obliga a escribir por qué, que es el punto.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Consultas que legítimamente no filtran por organización, cada una con su razón.
// Ampliar esta lista es una decisión consciente que queda registrada en el diff.
const EXCEPCIONES = {
  'infrastructure/web/routes/publicProposalRoutes.js':
    'capability URL: la propuesta se localiza por public_token (16 bytes aleatorios, ' +
    'único e indexado) y las escrituras usan el id ya resuelto por ese token. ' +
    'El cliente final no tiene sesión, así que no hay organización que exigir.',
  'infrastructure/web/routes/agentMemoryRoutes.js':
    'actualiza por el id de un registro que la consulta inmediatamente anterior ' +
    'ya resolvió filtrando por organization_id.',
  'services/automation/AutomationDispatcher.js':
    'actualiza el estado del automation_job que el propio dispatcher acaba de ' +
    'crear con el tenantId en curso.',
  'application/backup/RestoreService.js':
    'upsert que reescribe organization_id en cada fila antes de insertar.',
  'modules/webhooks/application/WebhookInbox.js':
    'tabla de infraestructura, no de datos de cliente: el evento se guarda ANTES ' +
    'de resolver a qué organización pertenece —por eso organization_id es ' +
    'nullable— y el consumidor lee lo pendiente de todas. Filtrar por ' +
    'organización aquí impediría precisamente lo que este buzón existe para ' +
    'evitar: perder un evento porque su tenant no se pudo resolver.',
};

function tablasMultiTenant() {
  const dir = path.join(ROOT, 'supabase/migrations');
  const sql = fs.readdirSync(dir).filter(f => f.endsWith('.sql'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(/gi;
  const out = {};
  let m;
  while ((m = re.exec(sql))) {
    let depth = 0, body = '';
    for (let i = m.index + m[0].length - 1; i < sql.length; i++) {
      const c = sql[i];
      if (c === '(') depth++;
      else if (c === ')') { depth--; if (depth === 0) break; }
      body += c;
    }
    out[m[1]] = out[m[1]] || /organization_id/i.test(body);
  }
  return new Set(Object.keys(out).filter(k => out[k]));
}

// Sólo el código versionado del backend. Los scripts sueltos de depuración que
// alguien deja en el árbol no son parte de la aplicación, y hacerlos fallar el
// gate empujaría a "arreglarlos" en vez de a sacarlos de src/.
function ficheros() {
  return require('child_process')
    .execSync('git ls-files src/backend', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(ROOT, f));
}

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

const TENANT = tablasMultiTenant();

// CONTROL POSITIVO: si el parseo de migraciones fallara, TENANT quedaría vacío
// y el barrido no examinaría nada, pasando en verde sin haber mirado.
check('CONTROL: se derivaron tablas multi-tenant de las migraciones',
  TENANT.size >= 30, `solo ${TENANT.size} tablas — ¿falló el parseo de migraciones?`);

const infracciones = [];
let revisadas = 0;
let exentas = 0;

for (const f of ficheros()) {
  const rel = path.relative(path.join(ROOT, 'src/backend'), f);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    const m = ln.match(/\.from\(['"]([a-z_]+)['"]\)/);
    if (!m || !TENANT.has(m[1])) return;
    revisadas++;
    const ventana = lines.slice(i, i + 12).join('\n');
    if (/organization_id|organizationId/.test(ventana)) return;
    if (EXCEPCIONES[rel]) return;

    // Excepción por consulta.
    //
    // Se retrocede hasta 12 líneas buscando el marcador, porque una razón bien
    // escrita ocupa varias líneas de comentario. Pero el barrido se DETIENE al
    // topar con otra consulta: así un marcador no puede eximir por accidente a
    // la consulta de al lado, que es el fallo que convertiría este mecanismo en
    // un agujero.
    let exento = false;
    for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
      if (/\.from\(['"][a-z_]+['"]\)/.test(lines[j])) break;
      if (/audit-tenant-filter:\s*exento\s*—\s*\S+/.test(lines[j])) { exento = true; break; }
    }
    if (exento) { exentas++; return; }

    infracciones.push(`${rel}:${i + 1} sobre '${m[1]}'`);
  });
}

// CONTROL POSITIVO: confirma que el barrido encontró consultas que examinar.
check('CONTROL: el barrido examinó consultas reales',
  revisadas >= 50, `solo ${revisadas} consultas a tablas multi-tenant`);

check(`ninguna consulta multi-tenant sin filtro de organización (${revisadas} revisadas, ${exentas} exentas con razón)`,
  infracciones.length === 0,
  `\n      ` + infracciones.join('\n      '));

console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
process.exit(failed === 0 ? 0 : 1);
