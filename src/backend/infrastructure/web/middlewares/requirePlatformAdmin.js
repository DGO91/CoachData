'use strict';

/**
 * Rol de plataforma: quien opera la agencia, por encima de cualquier organización.
 *
 * requireOwnerRole comprueba que alguien es propietario de UNA organización. No
 * existía nada por encima: no había forma de ver el estado de todos los clientes
 * a la vez, que es el instrumento de trabajo de un negocio hecho-para-ti.
 *
 * La lista vive en una variable de entorno y no en la base de datos a propósito.
 * Son una o dos personas, cambian casi nunca, y guardarlo en una tabla crearía un
 * camino para escalar privilegios: quien lograse escribir una fila se convertiría
 * en administrador de toda la plataforma. Desde el entorno, eso exige acceso al
 * servidor.
 *
 *   PLATFORM_ADMIN_USER_IDS=uuid-1,uuid-2
 */
function idsAdministradores() {
    return (process.env.PLATFORM_ADMIN_USER_IDS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function requirePlatformAdmin(req, res, next) {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Se requiere sesión' });
    }

    const permitidos = idsAdministradores();
    if (!permitidos.length) {
        // Sin lista configurada no se abre a nadie. Un valor por omisión
        // permisivo aquí convertiría un despiste de configuración en acceso
        // total a los datos de todos los clientes.
        console.error('[PlatformAdmin] PLATFORM_ADMIN_USER_IDS no está configurada: se deniega el acceso.');
        return res.status(403).json({ error: 'Forbidden', message: 'Panel de plataforma no configurado' });
    }

    if (!permitidos.includes(userId)) {
        return res.status(403).json({ error: 'Forbidden', message: 'No tienes acceso al panel de plataforma' });
    }

    next();
}

module.exports = { requirePlatformAdmin, idsAdministradores };
