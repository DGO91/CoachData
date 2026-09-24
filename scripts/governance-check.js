#!/usr/bin/env node
/**
 * governance-check.js
 *
 * Arbitro mecanico de las reglas de .agents/rules/.
 *
 * Existe porque una regla escrita en un SKILL.md solo se cumple si el modelo
 * decide leerla y recordarla. Este script no decide ni recuerda: mira el codigo
 * y falla. Es la unica parte del sistema de gobernanza que no puede alucinar,
 * y por eso es la que tienen que ejecutar TODOS los agentes (Claude Code,
 * Antigravity, o una persona) antes de dar por cerrado un trabajo.
 *
 * Cada check nace de un fallo real encontrado en el repo, no de una buena
 * intencion generica. Si un check no puede fallar nunca, sobra: borralo.
 *
 * Uso:
 *   node scripts/governance-check.js              # todo el repo
 *   node scripts/governance-check.js <archivo>…   # solo esos archivos
 *   node scripts/governance-check.js --quiet      # solo el veredicto
 *
 * Salida: 0 si limpio, 1 si hay violaciones.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'src/frontend/src');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const explicitFiles = args.filter(a => !a.startsWith('--'));

/* ─────────────── utilidades ─────────────── */

function walk(dir, filterFn, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'venv' || entry.name.startsWith('.')) continue;
      walk(full, filterFn, acc);
    } else if (filterFn(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const rel = f => path.relative(ROOT, f);
const violations = [];

function report(rule, file, line, message, evidence) {
  violations.push({ rule, file: rel(file), line, message, evidence });
}

/** Una linea de comentario describe una regla, no la incumple. */
function isComment(text) {
  const t = text.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('#');
}

/**
 * Exencion explicita y auditable. Un check con falsos positivos se acaba
 * ignorando, asi que en vez de esconder excepciones dentro del script, se
 * declaran en el propio codigo y quedan a la vista en la revision:
 *
 *   { id: 'ivory', swatch: '#B8985A' },  // governance-allow: design-tokens — muestra de color del selector de temas
 */
function isExempt(text, rule) {
  const m = text.match(/governance-allow:\s*([\w-]+)/);
  return Boolean(m && (m[1] === rule || m[1] === 'all'));
}

function skipLine(text, rule) {
  return isComment(text) || isExempt(text, rule);
}

/* ─────────────── checks ─────────────── */

/**
 * REGLA: design tokens (frontend_design_system_governance.md)
 * Origen: 133 usos de --accent como texto y 19 `text-white` sobre acento
 * dejaban botones ilegibles en las paletas de acento palido.
 */
function checkHardcodedColors(files) {
  // Colores que duplican un token existente. No se marca cualquier hex:
  // los gradientes de marca y los fondos fijos de paginas publicas son legitimos.
  const TOKEN_DUPES = {
    '#2ecc71': '--success', '#d9534f': '--danger', '#B8985A': '--accent (o --color-gold)',
    '#b8985a': '--accent (o --color-gold)', '#2D4A3A': '--accent', '#2d4a3a': '--accent',
  };
  for (const file of files) {
    if (!/\.(jsx|css)$/.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'design-tokens')) return;
      for (const [hex, token] of Object.entries(TOKEN_DUPES)) {
        if (text.includes(hex) && !text.includes('--')) {
          report('design-tokens', file, i + 1, `${hex} duplica el token ${token}`, text.trim().slice(0, 90));
        }
      }
    });
  }
}

/**
 * REGLA: contraste sobre acento
 * Origen: el acento es oro claro en las paletas oscuras; texto blanco encima
 * daba 2.2:1. El token correcto es --accent-text (o --accent-ink para texto).
 */
function checkWhiteOnAccent(files) {
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'contrast')) return;
      if (/bg-\[var\(--accent\)\]/.test(text) && /text-white/.test(text)) {
        report('contrast', file, i + 1, 'text-white sobre --accent: usa text-[var(--accent-text)]', text.trim().slice(0, 90));
      }
      if (/var\(--accent[,)]/.test(text) && /color:\s*['"]#(fff|ffffff|FFF|FFFFFF)['"]/.test(text)) {
        report('contrast', file, i + 1, "color '#fff' sobre --accent: usa 'var(--accent-text, #fff)'", text.trim().slice(0, 90));
      }
    });
  }
}

/**
 * REGLA: no mock data (no_mock_data_policy.md)
 * Origen: datos inventados que se muestran como reales al usuario final.
 */
function checkMockData(files) {
  const NEEDLES = ['John Doe', 'Jane Doe', 'Acme Inc', 'Acme Corp', 'Nova Consulting', '4242 4242', '•••• 4242'];
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    if (/\/(pages\/public|__tests__)\//.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'mock-data')) return;
      for (const needle of NEEDLES) {
        if (text.includes(needle)) {
          report('mock-data', file, i + 1, `dato ficticio "${needle}" en componente de produccion`, text.trim().slice(0, 90));
        }
      }
    });
  }
}

/**
 * REGLA: sin artefactos de IA (ai_artifact_prohibition.md)
 * Solo marca el ICONO importado de lucide, no la palabra suelta en un texto.
 */
function checkAIArtifacts(files) {
  const BANNED = ['Sparkles', 'Brain', 'Rocket', 'Wand', 'Wand2', 'Magic'];
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    const src = fs.readFileSync(file, 'utf8');
    const importMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
    if (!importMatch) continue;
    const imported = importMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim());
    const lineNo = src.slice(0, importMatch.index).split('\n').length;
    for (const icon of imported) {
      if (BANNED.includes(icon)) {
        report('ai-artifacts', file, lineNo, `icono decorativo prohibido: ${icon}`, importMatch[0].slice(0, 90));
      }
    }
  }
}

/**
 * REGLA: className duplicado
 * Origen: 23 casos donde JSX descartaba el primer className en silencio,
 * perdiendo las clases de tipografia y color.
 */
function checkDuplicateClassName(files) {
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'duplicate-classname')) return;
      if ((text.match(/className="/g) || []).length > 1 && /className="[^"]*"\s+className="/.test(text)) {
        report('duplicate-classname', file, i + 1, 'dos className en el mismo tag: JSX descarta el primero', text.trim().slice(0, 90));
      }
    });
  }
}

/**
 * REGLA: sin dialogos nativos
 * Origen: 29 alert() y 9 window.confirm() migrados a components/common/Notifications.jsx.
 */
function checkNativeDialogs(files) {
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    if (file.includes('Notifications.jsx')) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'native-dialog')) return;
      if (/(^|[^.\w])alert\(/.test(text)) {
        report('native-dialog', file, i + 1, 'alert() nativo: usa notify() de useNotifications()', text.trim().slice(0, 90));
      }
      if (/window\.confirm\(/.test(text)) {
        report('native-dialog', file, i + 1, 'window.confirm(): usa confirm() de useNotifications()', text.trim().slice(0, 90));
      }
    });
  }
}

/**
 * REGLA: un test que no puede fallar no es un test
 * Origen: dos suites entregadas imprimian [PASS] incondicionalmente. Este es
 * el check mas importante del archivo: protege contra el verde falso, que es
 * peor que no tener test porque nos hace creer que algo esta cubierto.
 */
function checkFakeTests() {
  const testFiles = walk(SCRIPTS_DIR, n => /^test-.*\.js$/.test(n))
    // >100KB no es una suite de pruebas, es residuo de sesiones antiguas
    .filter(f => fs.statSync(f).size < 100_000);
  for (const file of testFiles) {
    const src = fs.readFileSync(file, 'utf8');
    const lines = src.split('\n');

    // 1. Sin ningun camino que marque fallo
    // El patron de salida admite tanto `process.exit(1)` como la forma
    // condicional `process.exit(cond ? 0 : 1)`, que es un camino de fallo igual
    // de real. Buscar solo la literal marcaba como decorativas suites que si
    // fallan. `process.exit(0)` sigue sin contar.
    const hasFailPath = /passed\s*=\s*false|process\.exit\([^)]*\b1\b[^)]*\)|throw new|assert|expect\(/.test(src);
    if (!hasFailPath) {
      report('fake-test', file, 1, 'ningun camino marca fallo: el veredicto es una constante', 'sin `passed = false`, `throw`, `assert` ni `expect`');
      continue;
    }

    // 2. [PASS] impreso dentro de una rama de "no pude probarlo"
    lines.forEach((text, i) => {
      if (!/\[PASS\]/.test(text)) return;
      const context = lines.slice(Math.max(0, i - 3), i).join(' ');
      if (/else if\s*\(.*(40[13]|error|catch|no .*client|dev mode)/i.test(context)) {
        report('fake-test', file, i + 1, '[PASS] en una rama de "no se pudo verificar": deberia ser SKIP o FAIL', text.trim().slice(0, 90));
      }
    });

    // 3. [PASS] dentro de forEach/for sin ninguna comparacion
    lines.forEach((text, i) => {
      if (!/\[PASS\]/.test(text)) return;
      const block = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
      const hasComparison = /if\s*\(|===|!==|>=|<=|>|</.test(block);
      if (/forEach|for\s*\(/.test(block) && !hasComparison) {
        report('fake-test', file, i + 1, '[PASS] impreso en bucle sin comprobar nada', text.trim().slice(0, 90));
      }
    });

    // 4. Condicion que no puede ser falsa
    lines.forEach((text, i) => {
      if (/if\s*\(!error\s*&&\s*Array\.isArray\(\w+\)\)/.test(text)) {
        report('fake-test', file, i + 1, 'Array.isArray() es cierto con 0 filas y con 5000: la asercion no puede fallar', text.trim().slice(0, 90));
      }
    });

    // 5. RLS verificado con service_role (que lo bypassa por diseno).
    // service_role sirve para el setup admin (crear usuarios de prueba); lo
    // que no vale es que sea el UNICO cliente usado para la consulta que se
    // reporta como prueba de aislamiento. Si el archivo tambien crea un
    // cliente anon con un JWT de usuario real (createClient(...) + un header
    // Authorization: Bearer <token de sesion>), la prueba es legitima.
    if (/getSupabaseClient\(\)/.test(src) && /rls|isolation|tenant/i.test(path.basename(file))) {
      const usesRealAnonSession = /createClient\(/.test(src)
        && /Authorization:\s*`Bearer \$\{/.test(src)
        && /\.access_token/.test(src)
        && /signInWithPassword|auth\.signIn/.test(src);
      if (!usesRealAnonSession) {
        report('fake-test', file, 1, 'usa getSupabaseClient() (service_role) para probar aislamiento: ese cliente bypassa RLS', 'usa cliente anon + JWT del usuario');
      }
    }
  }
}


/**
 * REGLA: propiedades de estilo inline que no existen en CSS
 * Origen: `justify: 'center'` en AuthGateway dejaba la pantalla de login pegada
 * al borde izquierdo. React ignora en silencio una propiedad desconocida, asi
 * que no hay error en consola ni fallo de build: solo un layout roto.
 */
function checkInvalidStyleProps(files) {
  const INVALID = {
    'justify:': 'justifyContent',
    'align:': 'alignItems',
    'direction:': 'flexDirection',
    'wrap:': 'flexWrap',
  };
  for (const file of files) {
    if (!file.endsWith('.jsx')) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'invalid-style-prop')) return;
      for (const [bad, good] of Object.entries(INVALID)) {
        // solo dentro de un objeto de estilo, no en JSX props ni en CSS
        if (new RegExp(`[{,]\\s*${bad}\\s*['"]`).test(text)) {
          report('invalid-style-prop', file, i + 1, `"${bad}" no es una propiedad CSS valida: usa ${good}`, text.trim().slice(0, 90));
        }
      }
    });
  }
}


/**
 * REGLA: cero es un dato valido (no_mock_data_policy.md)
 * Origen: `activeProjects.length || (safeProjects.length > 0 ? ... : 1)` hacia
 * que el Dashboard mostrara "1 proyecto activo" a una cuenta sin proyectos.
 * Un contador que se niega a mostrar cero esta inventando datos.
 */
function checkFakeCounters(files) {
  for (const file of files) {
    if (!/\.(jsx|js)$/.test(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'fake-counter')) return;
      // `algo.length || <numero distinto de 0>`
      if (/\.length\s*\|\|\s*[1-9]/.test(text)) {
        report('fake-counter', file, i + 1, 'fallback numerico sobre .length: cero es un dato valido, no lo sustituyas', text.trim().slice(0, 90));
      }
      // ternario que devuelve un numero inventado cuando la lista esta vacia
      if (/\.length\s*>\s*0\s*\?[^:]+:\s*[1-9]/.test(text)) {
        report('fake-counter', file, i + 1, 'ternario que inventa un contador cuando no hay datos', text.trim().slice(0, 90));
      }
    });
  }
}


/**
 * REGLA: el frontend no debe llamar a /api sin cabeceras de auth
 * Origen: 10 llamadas con `fetch('/api/...')` a rutas protegidas sin token ni
 * x-organization-slug. Como una ruta inexistente devuelve 200 con HTML en vez
 * de 404, el sintoma era una pantalla vacia sin ningun error: el peor modo de
 * fallo posible. Usa authFetch/apiJson de core/api/authFetch.js.
 */
function checkBareApiFetch(files) {
  // rutas publicas de verdad: no llevan auth a proposito
  const PUBLICAS = ['/api/public/', '/api/webhooks/', '/api/system/'];
  for (const file of files) {
    if (!/\.(jsx|js)$/.test(file)) continue;
    if (file.includes('core/api/authFetch')) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (skipLine(text, 'bare-api-fetch')) return;
      // la exencion puede ir en las 4 lineas anteriores (comentario de bloque)
      if (lines.slice(Math.max(0, i - 4), i).some(l => isExempt(l, 'bare-api-fetch'))) return;
      const m = text.match(/(?<![.\w])fetch\(\s*[`'"](\/api\/[^`'"]+)/);
      if (!m) return;
      if (PUBLICAS.some(p => m[1].startsWith(p))) return;
      // se admite si la llamada pasa cabeceras de alguna forma: en la misma
      // linea, en las siguientes, o via una variable `headers` ya construida
      const bloque = lines.slice(i, i + 6).join(' ');
      if (/authHeaders|Authorization|x-organization-slug|headers\s*[,})]|headers:/.test(bloque)) return;
      report('bare-api-fetch', file, i + 1, `fetch('${m[1]}') sin cabeceras de auth: usa authFetch()`, text.trim().slice(0, 90));
    });
  }
}

/* ─────────────── ejecucion ─────────────── */

const frontendFiles = explicitFiles.length
  ? explicitFiles.map(f => path.resolve(ROOT, f)).filter(f => fs.existsSync(f))
  : walk(FRONTEND_SRC, n => /\.(jsx|css)$/.test(n));

checkHardcodedColors(frontendFiles);
checkWhiteOnAccent(frontendFiles);
checkMockData(frontendFiles);
checkAIArtifacts(frontendFiles);
checkDuplicateClassName(frontendFiles);
checkNativeDialogs(frontendFiles);
checkInvalidStyleProps(frontendFiles);
checkBareApiFetch(frontendFiles);
checkFakeCounters([...frontendFiles, ...walk(path.join(FRONTEND_SRC, 'hooks'), n => n.endsWith('.js'))]);
if (!explicitFiles.length) checkFakeTests();

/* ─────────────── informe ─────────────── */

if (!quiet) {
  console.log('='.repeat(60));
  console.log('GOVERNANCE CHECK — reglas de .agents/rules/');
  console.log('='.repeat(60));
}

if (violations.length === 0) {
  console.log(`LIMPIO — ${frontendFiles.length} archivos revisados, 0 violaciones.`);
  process.exit(0);
}

const byRule = violations.reduce((acc, v) => {
  (acc[v.rule] = acc[v.rule] || []).push(v);
  return acc;
}, {});

for (const [rule, items] of Object.entries(byRule)) {
  console.log(`\n[${rule}] ${items.length} violacion(es)`);
  for (const v of items.slice(0, 15)) {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`    → ${v.message}`);
    if (v.evidence) console.log(`      ${v.evidence}`);
  }
  if (items.length > 15) console.log(`  … y ${items.length - 15} mas`);
}

console.log('\n' + '-'.repeat(60));
console.log(`VEREDICTO: ${violations.length} violacion(es) en ${new Set(violations.map(v => v.file)).size} archivo(s)`);
process.exit(1);
