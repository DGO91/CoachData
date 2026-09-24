/**
 * test-tailwind-build.js
 * Verifica que Tailwind se compila en el build y no llega por CDN.
 *
 * El proyecto cargaba https://cdn.tailwindcss.com desde index.html: compilaba en
 * el navegador de cada visitante, sin purga, dependiendo de un tercero para que
 * la aplicación se viera, y obligando a 'unsafe-inline' en el CSP.
 *
 * El riesgo al migrar no es que el build falle —eso se ve— sino que la purga se
 * configure mal y el CSS salga sin las clases que los componentes usan: la
 * aplicación se sirve, compila, y aparece rota. Por eso este test no se limita a
 * comprobar que existe un CSS: extrae clases reales del código y exige que estén
 * generadas.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'src/frontend/public');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// 1. Ni rastro del CDN en el HTML servido ni en el fuente.
for (const rel of ['src/frontend/index.html', 'src/frontend/public/index.html']) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8');
  check(`${rel} no carga Tailwind por CDN`,
    !/<script[^>]+cdn\.tailwindcss\.com/.test(html), 'sigue incluyendo el script del CDN');
  check(`${rel} no define tailwind.config en un script inline`,
    !/tailwind\.config\s*=/.test(html), 'sigue configurando Tailwind en el navegador');
}

// 2. Debe existir un CSS compilado y estar enlazado desde el HTML servido.
const htmlServido = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const enlace = htmlServido.match(/href="\/(assets\/[^"]+\.css)"/);
check('el HTML servido enlaza una hoja de estilos del build',
  !!enlace, 'no hay <link rel="stylesheet"> a /assets/*.css');

if (!enlace) {
  console.log('\nRESULTADO: ' + (failed + 1) + ' FALLOS');
  process.exit(1);
}

const cssPath = path.join(PUBLIC, enlace[1]);
check('CONTROL: el CSS enlazado existe en disco', fs.existsSync(cssPath), cssPath);
const css = fs.readFileSync(cssPath, 'utf8');

// 3. Las clases que usan los componentes tienen que estar generadas. Se toman
//    del código real, no de una lista escrita a mano que envejecería.
const jsx = execSync('git ls-files "src/frontend/src/**/*.jsx"', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const usadas = new Set();
for (const rel of jsx) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const m of src.matchAll(/className="([^"{]+)"/g)) {
    for (const c of m[1].split(/\s+/)) {
      // Utilidades comunes e inequívocas de Tailwind, sin variantes ni
      // valores arbitrarios: lo justo para detectar una purga rota.
      if (/^(flex|grid|hidden|block|relative|absolute|truncate)$/.test(c)) usadas.add(c);
      else if (/^(p|m|px|py|mx|my|mt|mb|gap|w|h)-\d+$/.test(c)) usadas.add(c);
      else if (/^text-(xs|sm|base|lg|xl)$/.test(c)) usadas.add(c);
      else if (/^rounded(-(sm|md|lg|xl|full))?$/.test(c)) usadas.add(c);
    }
  }
}

check('CONTROL: se extrajeron clases de los componentes',
  usadas.size >= 15, `solo ${usadas.size} clases detectadas en ${jsx.length} ficheros`);

const ausentes = [...usadas].filter(c => !css.includes(`.${c.replace(/([:.\\/])/g, '\\$1')}`));
check(`todas las clases usadas están en el CSS compilado (${usadas.size} comprobadas)`,
  ausentes.length === 0, `faltan: ${ausentes.slice(0, 20).join(' ')}`);

// 4. El CSS propio del proyecto sigue ahí: la migración no debe haberlo perdido.
check('el CSS del sistema de diseño sigue presente',
  /--bg-root|--text-primary/.test(css), 'no aparecen las variables del design system');

console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
process.exit(failed === 0 ? 0 : 1);
