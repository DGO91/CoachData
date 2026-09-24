const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

/**
 * Cifrado de credenciales de cliente, con clave versionada.
 *
 * Antes había una sola clave y el texto cifrado no dejaba constancia de cuál se
 * había usado. Al rotar ENCRYPTION_MASTER_KEY, todo lo cifrado con la anterior
 * quedaba ilegible sin ninguna vía de recuperación: dos coaches perdieron así
 * sus credenciales de Google y tuvieron que reconectar.
 *
 * Ahora cada valor cifrado lleva escrita su versión de clave, y el servicio
 * conserva las claves antiguas sólo para descifrar. Rotar deja de ser
 * destructivo: se genera una clave nueva, la anterior pasa a histórica, y lo ya
 * guardado se sigue leyendo mientras se reescribe cuando toque.
 *
 * Variables de entorno:
 *   ENCRYPTION_MASTER_KEY        clave activa — con ella se cifra todo lo nuevo
 *   ENCRYPTION_KEY_VERSION       número de versión de la activa (por omisión 1)
 *   ENCRYPTION_MASTER_KEY_V1..N  claves retiradas, sólo para descifrar
 *
 * Formatos que conviven:
 *   v2:iv:authTag:datos   versionado
 *   iv:authTag:datos      heredado, anterior al versionado
 */

function parseKey(hex, nombre) {
    if (!hex || hex.length !== 64) {
        throw new Error(`${nombre} inválida. Debe ser una cadena hexadecimal de 64 caracteres.`);
    }
    return Buffer.from(hex, 'hex');
}

function versionActiva() {
    const v = parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);
    if (!Number.isInteger(v) || v < 1) {
        throw new Error('ENCRYPTION_KEY_VERSION debe ser un número entero mayor o igual que 1.');
    }
    return v;
}

function claveActiva() {
    return parseKey(process.env.ENCRYPTION_MASTER_KEY, 'ENCRYPTION_MASTER_KEY');
}

/**
 * Claves candidatas para descifrar, de la más probable a la menos: primero la
 * indicada en el propio valor, después la activa, y por último las históricas.
 * Probar varias es lo que permite leer datos escritos antes de una rotación.
 */
function clavesParaDescifrar(versionDelValor) {
    const candidatas = [];
    const vistas = new Set();

    const añadir = (hex, nombre) => {
        if (!hex || vistas.has(hex)) return;
        vistas.add(hex);
        candidatas.push({ key: parseKey(hex, nombre), nombre });
    };

    if (versionDelValor != null) {
        añadir(process.env[`ENCRYPTION_MASTER_KEY_V${versionDelValor}`], `ENCRYPTION_MASTER_KEY_V${versionDelValor}`);
        if (versionDelValor === versionActiva()) {
            añadir(process.env.ENCRYPTION_MASTER_KEY, 'ENCRYPTION_MASTER_KEY');
        }
    }

    añadir(process.env.ENCRYPTION_MASTER_KEY, 'ENCRYPTION_MASTER_KEY');

    // Históricas, de la más reciente a la más antigua.
    for (let v = versionActiva(); v >= 1; v--) {
        añadir(process.env[`ENCRYPTION_MASTER_KEY_V${v}`], `ENCRYPTION_MASTER_KEY_V${v}`);
    }

    if (!candidatas.length) {
        throw new Error('No hay ninguna clave de cifrado configurada (ENCRYPTION_MASTER_KEY).');
    }
    return candidatas;
}

/**
 * Cifra con la clave activa y deja escrita su versión.
 * @param {string} text
 * @returns {string} "v<N>:iv:authTag:datos"
 */
function encrypt(text) {
    if (!text) return text;

    const key = claveActiva();
    const iv = crypto.randomBytes(12); // GCM usa 12 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `v${versionActiva()}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Descifra, acepte el formato que acepte, probando las claves conocidas.
 * @param {string} encryptedString
 * @returns {string}
 */
function decrypt(encryptedString) {
    if (!encryptedString) return encryptedString;

    const parts = encryptedString.split(':');
    let version = null;
    let ivHex, authTagHex, encryptedHex;

    if (parts.length === 4 && /^v\d+$/.test(parts[0])) {
        version = parseInt(parts[0].slice(1), 10);
        [, ivHex, authTagHex, encryptedHex] = parts;
    } else if (parts.length === 3) {
        // Formato anterior al versionado: no dice con qué clave se cifró, así
        // que hay que probarlas todas.
        [ivHex, authTagHex, encryptedHex] = parts;
    } else {
        throw new Error('Formato de valor cifrado no reconocido. Se esperaba "v<N>:iv:authTag:datos" o "iv:authTag:datos".');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    let ultimoError = null;

    for (const { key } of clavesParaDescifrar(version)) {
        try {
            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err) {
            // GCM valida integridad: con la clave equivocada falla siempre, así
            // que un fallo aquí sólo significa "no era esta". Se pasa a la
            // siguiente candidata.
            ultimoError = err;
        }
    }

    const pista = version != null
        ? `El valor se cifró con la versión ${version}; define ENCRYPTION_MASTER_KEY_V${version} para poder leerlo.`
        : 'El valor es de formato anterior al versionado; la clave con que se cifró ya no está configurada.';
    throw new Error(`No se pudo descifrar con ninguna clave conocida. ${pista}`);
}

/**
 * ¿Está este valor cifrado con la versión activa? Sirve para reescribir en
 * segundo plano lo que quedó en versiones antiguas, sin tocar lo que ya está
 * al día.
 */
function necesitaReescritura(encryptedString) {
    if (!encryptedString) return false;
    const parts = String(encryptedString).split(':');
    if (parts.length === 3) return true;                       // formato heredado
    if (parts.length === 4 && /^v\d+$/.test(parts[0])) {
        return parseInt(parts[0].slice(1), 10) !== versionActiva();
    }
    return false;
}

/** Descifra y vuelve a cifrar con la clave activa. */
function reescribir(encryptedString) {
    if (!encryptedString) return encryptedString;
    return encrypt(decrypt(encryptedString));
}

module.exports = {
    encrypt,
    decrypt,
    necesitaReescritura,
    reescribir,
};
