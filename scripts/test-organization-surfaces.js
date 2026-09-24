/**
 * test-organization-surfaces.js
 * Reglas de las superficies activas por organización.
 *
 * La lógica parece trivial y tiene tres trampas que sí importan: que una
 * organización antigua no herede sin querer una zona nueva, que el núcleo del
 * producto no se pueda apagar por error, y que una clave inventada en el cuerpo
 * de la petición no acabe escrita en settings_json.
 *
 * No toca la base de datos: prueba las reglas puras sustituyendo el cliente de
 * Supabase por uno de mentira. Las rutas HTTP se comprueban aparte.
 */
require('dotenv').config();
const path = require('path');

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// Cliente de Supabase de mentira: devuelve la fila que le pongamos y captura lo
// que se intenta escribir, para poder afirmar sobre ello.
let filaActual = { settings_json: {} };
let ultimoUpdate = null;

const fake = {
  from() {
    const api = {
      select: () => api,
      eq: () => api,
      single: async () => ({ data: filaActual, error: null }),
      update(payload) { ultimoUpdate = payload; return api; },
    };
    return api;
  },
};

const rutaModulo = path.resolve(__dirname, '../src/backend/infrastructure/database/supabaseClient.js');
require.cache[rutaModulo] = { id: rutaModulo, filename: rutaModulo, loaded: true, exports: { getSupabaseClient: () => fake } };

const {
  getSurfaces, updateSurfaces, SUPERFICIES_NUCLEO, SUPERFICIES_OPCIONALES,
} = require('../src/backend/application/organization/organizationSurfacesUseCase');

(async () => {
  // CONTROL POSITIVO: el doble está en su sitio. Si el require real ganara, las
  // llamadas irían contra Supabase y estas pruebas dirían cualquier cosa.
  filaActual = { settings_json: { surfaces: { 'media-suite': true } } };
  const control = await getSurfaces('org-x');
  check('CONTROL: el cliente de prueba está sustituyendo al real',
    control['media-suite'] === true, 'la lectura no devolvió lo que puso el doble');

  // 1. Organización sin nada guardado: manda el valor por omisión.
  filaActual = { settings_json: {} };
  const nuevas = await getSurfaces('org-nueva');
  // Nacen ENCENDIDAS desde el commit 9463e54 (19-08-2026): el propietario
  // resolvió que Media Suite y Revenue Suite se quedan, y esconder el ~40% del
  // código dejó de responder a ninguna duda abierta. Este test afirmaba lo
  // contrario y llevaba desde entonces en rojo sin que nadie lo mirara, porque
  // el gate solo corre en main y el trabajo vivía en una rama.
  check('una organización nueva nace con Media Suite encendida',
    nuevas['media-suite'] === true, `media-suite=${nuevas['media-suite']}`);
  check('una organización nueva nace con Revenue Suite encendida',
    nuevas['revenue-suite'] === true, `revenue-suite=${nuevas['revenue-suite']}`);
  check('el Portal de Clientes nace encendido',
    nuevas['client-portal'] === true, `client-portal=${nuevas['client-portal']}`);

  // 2. El núcleo del producto está siempre encendido, aunque alguien haya
  //    escrito lo contrario en settings_json a mano.
  filaActual = { settings_json: { surfaces: { dashboard: false, 'reports-hub': false } } };
  const nucleo = await getSurfaces('org-y');
  check('el núcleo no se puede apagar desde settings_json',
    SUPERFICIES_NUCLEO.every(k => nucleo[k] === true),
    SUPERFICIES_NUCLEO.map(k => `${k}=${nucleo[k]}`).join(' '));

  // 3. Sólo un booleano explícito anula el valor por omisión. Esto es lo que
  //    impide que añadir una zona nueva la encienda en las organizaciones que ya
  //    existían sin que nadie lo haya decidido.
  //
  //    Se comprueban las DOS direcciones. Con el valor por omisión en true,
  //    afirmar solo que la basura devuelve true sería un test débil: pasaría
  //    igualmente si el código convirtiera 'sí' en true, que es justo el fallo
  //    que este caso existe para detectar.
  filaActual = { settings_json: { surfaces: { 'media-suite': 'sí' } } };
  const basura = await getSurfaces('org-z');
  check('un valor que no es booleano no cuenta como decisión (cae al valor por omisión)',
    basura['media-suite'] === true, `media-suite=${basura['media-suite']}`);

  filaActual = { settings_json: { surfaces: { 'media-suite': false } } };
  const apagada = await getSurfaces('org-w');
  check('un false explícito SÍ anula el valor por omisión',
    apagada['media-suite'] === false, `media-suite=${apagada['media-suite']}`);

  // 4. Guardar sólo acepta claves conocidas.
  filaActual = { settings_json: { surfaces: {} } };
  ultimoUpdate = null;
  await updateSurfaces('org-w', { 'media-suite': true, 'zona-inventada': true, dashboard: false });
  const escritas = ultimoUpdate?.settings_json?.surfaces || {};
  check('se guarda la clave conocida', escritas['media-suite'] === true, JSON.stringify(escritas));
  check('se descarta la clave inventada', !('zona-inventada' in escritas), JSON.stringify(escritas));
  check('no se puede apagar el núcleo desde la petición',
    !('dashboard' in escritas), JSON.stringify(escritas));

  // 5. Guardar preserva el resto de settings_json: perfil y etapas de pipeline
  //    viven en la misma columna y no pueden perderse al tocar las zonas.
  filaActual = { settings_json: { industry: 'coaching', pipeline_stages: ['A', 'B'], surfaces: {} } };
  ultimoUpdate = null;
  await updateSurfaces('org-v', { 'revenue-suite': true });
  check('no se pisan otros ajustes de la organización',
    ultimoUpdate?.settings_json?.industry === 'coaching'
      && Array.isArray(ultimoUpdate?.settings_json?.pipeline_stages),
    JSON.stringify(ultimoUpdate?.settings_json));

  // 6. Una petición sin ninguna clave válida se rechaza en vez de escribir nada.
  let rechazo = false;
  try {
    await updateSurfaces('org-u', { 'zona-inventada': true });
  } catch (err) {
    rechazo = err.statusCode === 400;
  }
  check('una petición sin claves válidas se rechaza con 400', rechazo, 'no lanzó error 400');

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
