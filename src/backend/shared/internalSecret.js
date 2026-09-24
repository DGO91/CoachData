'use strict';

// Secreto con el que el servidor y los agentes firman sus JWT internos
// (role: 'internal-agent') y el state de OAuth.
//
// Antes cada consumidor hacía `process.env.INTERNAL_SECRET || '<literal>'`, y el
// literal estaba publicado en el repositorio: si la variable faltaba en un
// despliegue, cualquiera podía firmar un token interno válido. Ahora no hay
// valor por defecto. Si falta, el proceso no arranca.
//
// El valor antiguo se rechaza explícitamente, por si algún .env lo copió tal cual.
const VALORES_PUBLICADOS = new Set(['coachdata-internal-super-secret-key-2026']);

function getInternalSecret() {
    const secret = process.env.INTERNAL_SECRET;
    if (!secret) {
        throw new Error('[Config] Falta INTERNAL_SECRET. Genera uno con `openssl rand -hex 48` y ponlo en .env.');
    }
    if (VALORES_PUBLICADOS.has(secret)) {
        throw new Error('[Config] INTERNAL_SECRET tiene el valor que estuvo publicado en el repositorio. Rótalo.');
    }
    return secret;
}

module.exports = { getInternalSecret };
