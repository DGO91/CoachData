'use strict';

const { createClient } = require('@supabase/supabase-js');

/**
 * Cliente de Supabase con la identidad de quien hace la petición.
 *
 * Todo el backend consulta con SUPABASE_SERVICE_ROLE_KEY, que salta RLS por
 * diseño. Eso significa que las políticas escritas en las migraciones no
 * protegen ni una sola petición: el aislamiento entre organizaciones depende por
 * completo de que cada consulta recuerde su `.eq('organization_id', ...)`. Hay 87
 * consultas y un barrido que las vigila, pero no hay red debajo.
 *
 * Este cliente usa la clave anónima y viaja con el JWT del usuario, así que
 * Postgres aplica las políticas. Un filtro olvidado deja de ser una fuga y pasa a
 * ser, como mucho, una consulta que devuelve de menos.
 *
 * Cuándo NO usarlo:
 *   · webhooks entrantes — no hay usuario, el proveedor se autentica por firma
 *   · trabajos en segundo plano — el planificador no tiene sesión
 *   · el panel de la agencia — mira por encima de las organizaciones a propósito
 * Para esos casos sigue estando getSupabaseClient(), y está bien que así sea.
 */

function crearClienteDeUsuario(accessToken) {
    if (!accessToken) return null;

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    // Sin clave anónima no se puede construir: caer a la de servicio aquí
    // anularía en silencio todo el propósito de este módulo, que es
    // precisamente dejar de saltarse RLS.
    if (!url || !anonKey) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY: no se puede crear un cliente con la identidad del usuario.');
    }

    return createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

/**
 * Deja en req.db un cliente que consulta como el usuario de la sesión.
 *
 * Va después de authMiddleware, que es quien ha validado el token. Aquí sólo se
 * reutiliza ese mismo token: si no llega, no se inventa nada — se deja req.db a
 * null y la ruta decide, en lugar de degradar a un cliente con más permisos de
 * los que le corresponden.
 */
function userScopedClientMiddleware(req, res, next) {
    const cabecera = req.headers['authorization'];
    const token = cabecera && cabecera.startsWith('Bearer ') ? cabecera.substring(7) : null;

    try {
        req.db = crearClienteDeUsuario(token);
    } catch (err) {
        console.error('[UserScopedClient]', err.message);
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'La base de datos no está configurada para consultas con identidad de usuario.',
        });
    }

    next();
}

/**
 * Devuelve el cliente con identidad del usuario, o corta la petición.
 *
 * Se usa al principio de cada manejador migrado, en lugar de getSupabaseClient().
 * Si no hay cliente —petición sin cabecera de sesión— responde 401 y devuelve
 * null: la ruta debe hacer `if (!db) return;`. Nunca cae a service_role, que
 * saltaría RLS y anularía el motivo de este módulo.
 */
function dbDeUsuario(req, res) {
    if (!req.db) {
        res.status(401).json({ error: 'Unauthorized', message: 'Sesión no válida para consultar datos' });
        return null;
    }
    return req.db;
}

module.exports = { crearClienteDeUsuario, userScopedClientMiddleware, dbDeUsuario };
