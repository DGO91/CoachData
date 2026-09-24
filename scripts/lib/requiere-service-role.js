'use strict';

/**
 * Guarda compartida para las comprobaciones que necesitan una base de datos real.
 *
 * POR QUÉ EXISTE
 *
 * Seis comprobaciones del gate tocan datos de verdad: crean inquilinos, escriben
 * filas, o leen tablas a través de RLS. Todas acaban necesitando la clave de
 * SERVICIO, por una de estas dos vías:
 *
 *   - directa: crean un cliente con SUPABASE_SERVICE_ROLE_KEY;
 *   - indirecta: leen con RLS, lo que ejecuta get_auth_user_organizations(),
 *     y la migración 030 revocó ese permiso a PUBLIC. Con la clave publicable
 *     responde "permission denied".
 *
 * Esa clave se salta TODAS las políticas, así que no puede vivir en CI: quien
 * pudiera modificar un workflow podría extraerla. Y sin ella estas
 * comprobaciones no fallan por un defecto del código, fallan por falta de
 * configuración — que es ruido, no señal.
 *
 * QUÉ HACE
 *
 * Corta la ejecución con código 0, pero ANUNCIÁNDOLO y sin decir «PASS». La
 * diferencia importa: un salto silencioso da un verde que nadie puede
 * interpretar, y eso es peor que no tener el test.
 *
 * Se centraliza aquí en vez de copiarse en cada script para que el mensaje sea
 * uno solo. Seis copias del mismo aviso divergen en cuanto alguien toca una.
 *
 * LA SOLUCIÓN DE FONDO
 *
 * Cuando compense, un proyecto de Supabase aparte solo para CI, con su propia
 * clave de servicio que no toque datos de clientes. Entonces esta guarda deja de
 * saltar y las seis vuelven a correr en cada cambio.
 */
function requiereServiceRole(motivo) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return false;

  console.log('[SKIP] Omitido: falta SUPABASE_SERVICE_ROLE_KEY.');
  if (motivo) console.log(`       ${motivo}`);
  console.log('       Corre en local, donde el .env sí existe. En CI, no.');
  console.log('\nRESULTADO: OMITIDO (no ejecutado, no es un PASS)');
  return true;
}

module.exports = { requiereServiceRole };
