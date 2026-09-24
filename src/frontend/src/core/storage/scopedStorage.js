/**
 * Claves de localStorage con ámbito por organización.
 *
 * Project Desk, Content Desk y Message Bank guardaban su estado bajo una clave
 * global (`coachdata-project-desk-v2`, etc.). En un navegador compartido, o al
 * cambiar de cuenta sin limpiar el almacenamiento, una organización veía el
 * tablero de otra — incluido el contenido interno de CoachData apareciendo en
 * cuentas de cliente recién creadas.
 *
 * Añadir el id de organización a la clave hace que cada cuenta arranque con su
 * propio espacio vacío, sin necesidad de migrar nada: una clave nueva
 * simplemente no existe todavía.
 */

const ANON_SCOPE = 'anon';

export function scopedKey(baseKey, organizationId) {
  const scope = organizationId || ANON_SCOPE;
  return `${baseKey}::${scope}`;
}

/**
 * Borra las claves del esquema antiguo (sin ámbito). Se llama una sola vez por
 * pantalla: si no se limpian, quedan ocupando espacio y pueden reaparecer si
 * alguien revierte este cambio.
 */
export function purgeLegacyKey(baseKey) {
  try {
    if (localStorage.getItem(baseKey) !== null) {
      localStorage.removeItem(baseKey);
      return true;
    }
  } catch {
    // localStorage puede fallar en modo privado; no es motivo para romper la app
  }
  return false;
}
