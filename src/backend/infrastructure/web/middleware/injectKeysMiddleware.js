'use strict';

const { getSupabaseClient } = require('../../database/supabaseClient');
const { decrypt } = require('../../services/encryptionService');

/* Claves de modelo que este middleware saca de la bóveda para pasárselas al
   agente. Son los nombres que escribe la pantalla de Credenciales.

   Hacen falta porque user_credentials, de donde salía todo lo demás, no tiene
   columna para ellas: la cabecera X-Anthropic-Key se venía enviando desde
   `req.userKeys.anthropic_api_key`, que es siempre undefined. El resultado era
   que la clave tenía que llegar por otro sitio, y el sitio era localStorage. */
const CLAVES_DE_MODELO = ['anthropic_key', 'openai_key', 'google_key'];

/** Las claves de modelo del inquilino, descifradas. Sólo esas tres: descifrar
    la bóveda entera en cada petición sería caro y expondría de más. */
async function clavesDeModeloDelVault(supabase, tenantId) {
    if (!tenantId) return {};

    const { data, error } = await supabase
        .from('client_provider_keys')
        .select('provider_name, api_key_encrypted')
        .eq('tenant_id', tenantId)
        .in('provider_name', CLAVES_DE_MODELO);

    if (error) {
        console.error('[Proxy Middleware] No se pudieron leer las claves de modelo:', error.message);
        return {};
    }

    const claves = {};
    for (const fila of data || []) {
        if (!fila.api_key_encrypted) continue;
        try {
            claves[fila.provider_name] = decrypt(fila.api_key_encrypted);
        } catch (err) {
            /* Una clave que no descifra suele ser un cambio de ENCRYPTION_KEY.
               Se anota cuál, nunca su valor, y las demás siguen sirviendo. */
            console.error(`[Proxy Middleware] No se pudo descifrar ${fila.provider_name}:`, err.message);
        }
    }
    return claves;
}

const injectKeysMiddleware = async (req, res, next) => {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    } else if (req.query && req.query.token) {
        token = req.query.token; 
    }

    req.userKeys = {};
    req.modelKeys = {};
    req.tenantId = null;
    
    const supabase = getSupabaseClient();
    
    if (supabase && token) {
        try {
            const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
            if (!userErr && user) {
                const { data: creds } = await supabase
                    .from('user_credentials')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (creds) {
                    req.userKeys = creds;
                }

                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id')
                    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
                    .maybeSingle();
                if (tenant) {
                    req.tenantId = tenant.id;
                    req.modelKeys = await clavesDeModeloDelVault(supabase, tenant.id);
                }
            }
        } catch (err) {
            console.error('[Proxy Middleware] Error recuperando llaves o tenant del usuario:', err.message);
        }
    }
    next();
};

module.exports = injectKeysMiddleware;
