/**
 * test-encryption-key-rotation.js
 * Rotar la clave de cifrado no puede destruir credenciales.
 *
 * Dos coaches perdieron sus credenciales de Google porque el texto cifrado no
 * dejaba constancia de con qué clave se había escrito: al rotar
 * ENCRYPTION_MASTER_KEY, lo anterior quedó ilegible sin vía de recuperación.
 *
 * Este test simula una rotación completa y exige que lo cifrado antes se siga
 * leyendo. Incluye el caso más delicado: los valores en formato heredado, sin
 * versión escrita, que son los que hay hoy en la base de datos.
 */
require('dotenv').config();
const path = require('path');

const RUTA = path.resolve(__dirname, '../src/backend/infrastructure/services/encryptionService.js');
const K1 = 'a'.repeat(64);
const K2 = 'b'.repeat(64);
const K3 = 'c'.repeat(64);

let failed = 0;
const check = (name, cond, detail) => {
  if (cond) console.log(`[PASS] ${name}`);
  else { console.log(`[FAIL] ${name} — ${detail}`); failed++; }
};

// El servicio lee process.env en cada llamada, pero se recarga igualmente para
// que ningún estado quede colgado entre escenarios.
function cargar(env) {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith('ENCRYPTION_')) delete process.env[k];
  }
  Object.assign(process.env, env);
  delete require.cache[RUTA];
  return require(RUTA);
}

const SECRETO = 'ya29.token-de-google-del-coach';

(async () => {
  // 1. Ida y vuelta con una sola clave.
  let svc = cargar({ ENCRYPTION_MASTER_KEY: K1, ENCRYPTION_KEY_VERSION: '1' });
  const cifradoV1 = svc.encrypt(SECRETO);
  check('cifra y descifra con la clave activa', svc.decrypt(cifradoV1) === SECRETO, svc.decrypt(cifradoV1));
  check('el valor cifrado lleva escrita su versión', cifradoV1.startsWith('v1:'), cifradoV1.slice(0, 12));

  // CONTROL NEGATIVO: con una clave que no es, tiene que fallar. Si esto pasara,
  // el resto del test no probaría nada — GCM valida integridad justamente aquí.
  const svcAjeno = cargar({ ENCRYPTION_MASTER_KEY: K3, ENCRYPTION_KEY_VERSION: '1' });
  let rechazado = false;
  try { svcAjeno.decrypt(cifradoV1); } catch { rechazado = true; }
  check('CONTROL: una clave ajena no descifra', rechazado, 'descifró con una clave que no era');

  // 2. LA ROTACIÓN. Clave nueva activa, la anterior conservada como histórica.
  svc = cargar({
    ENCRYPTION_MASTER_KEY: K2,
    ENCRYPTION_KEY_VERSION: '2',
    ENCRYPTION_MASTER_KEY_V1: K1,
  });
  check('tras rotar, lo cifrado con la clave anterior se sigue leyendo',
    svc.decrypt(cifradoV1) === SECRETO, 'se perdió el valor al rotar');

  const cifradoV2 = svc.encrypt(SECRETO);
  check('lo nuevo se cifra con la clave activa', cifradoV2.startsWith('v2:'), cifradoV2.slice(0, 12));
  check('y también se lee', svc.decrypt(cifradoV2) === SECRETO, 'no se pudo leer lo recién cifrado');

  // 3. Formato heredado: sin versión escrita, que es lo que hay hoy guardado.
  const legacy = (() => {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(K1, 'hex'), iv);
    let e = c.update(SECRETO, 'utf8', 'hex'); e += c.final('hex');
    return `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${e}`;
  })();
  check('un valor sin versión (formato anterior) se sigue leyendo tras rotar',
    svc.decrypt(legacy) === SECRETO, 'se perdió un valor en formato heredado');

  // 4. Detección de lo que conviene reescribir.
  check('un valor de versión antigua se marca para reescritura',
    svc.necesitaReescritura(cifradoV1) === true, 'no lo marcó');
  check('un valor heredado se marca para reescritura',
    svc.necesitaReescritura(legacy) === true, 'no lo marcó');
  check('un valor ya al día no se marca',
    svc.necesitaReescritura(cifradoV2) === false, 'lo marcó sin necesidad');

  // 5. Reescritura: mismo secreto, ahora bajo la clave activa.
  const reescrito = svc.reescribir(cifradoV1);
  check('reescribir conserva el contenido', svc.decrypt(reescrito) === SECRETO, 'cambió el secreto');
  check('reescribir lo pasa a la versión activa', reescrito.startsWith('v2:'), reescrito.slice(0, 12));

  // 6. Si falta la clave histórica, el error dice exactamente qué configurar.
  const svcSinHistorica = cargar({ ENCRYPTION_MASTER_KEY: K2, ENCRYPTION_KEY_VERSION: '2' });
  let mensaje = '';
  try { svcSinHistorica.decrypt(cifradoV1); } catch (e) { mensaje = e.message; }
  check('el error nombra la variable que falta',
    mensaje.includes('ENCRYPTION_MASTER_KEY_V1'), mensaje.slice(0, 90));

  // 7. Valores vacíos pasan tal cual, sin reventar.
  check('un valor vacío no se cifra ni falla',
    svc.encrypt('') === '' && svc.decrypt(null) === null, 'trató mal un valor vacío');

  console.log(failed === 0 ? '\nRESULTADO: OK' : `\nRESULTADO: ${failed} FALLOS`);
  process.exit(failed === 0 ? 0 : 1);
})();
