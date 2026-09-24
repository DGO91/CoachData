const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');
const { encrypt, decrypt } = require('../../infrastructure/services/encryptionService');

// Legacy user_credentials save
async function saveLegacyCredentials(userId, updates) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const row = {
        user_id:                userId,
        anthropic_api_key:      updates.ANTHROPIC_API_KEY      ?? null,
        google_api_key:         updates.GOOGLE_API_KEY         ?? null,
        openai_api_key:         updates.OPENAI_API_KEY         ?? null,
        whatsapp_phone:         updates.WHATSAPP_PHONE         ?? null,
        whatsapp_api_key:       updates.WHATSAPP_API_KEY       ?? null,
        whatsapp_provider:      updates.WHATSAPP_PROVIDER      ?? 'evolution',
        google_apps_script_url: updates.GOOGLE_APPS_SCRIPT_URL ?? null,
        updated_at:             new Date().toISOString(),
    };

    const { error: upsertErr } = await supabase
        .from('user_credentials')
        .upsert(row, { onConflict: 'user_id' });

    if (upsertErr) throw upsertErr;
    return true;
}

// Fetch for internal agents
async function getDecryptedTenantKeys(tenantId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.from('client_provider_keys')
        .select('*')
        .eq('tenant_id', tenantId);
    if (error) throw error;

    let userName = 'Usuario';
    try {
        const { data: profileData } = await supabase.from('profiles')
            .select('name')
            .eq('id', tenantId)
            .maybeSingle();
        if (profileData && profileData.name) {
            userName = profileData.name;
        }
    } catch (err) {
        console.error("Profile fetch error:", err);
    }

    const decryptedKeys = {};
    (data || []).forEach(k => {
        if (k.api_key_encrypted) {
            try {
                decryptedKeys[k.provider_name] = decrypt(k.api_key_encrypted);
            } catch (err) {
                console.error(`Failed to decrypt key for provider ${k.provider_name}:`, err.message);
                decryptedKeys[k.provider_name] = null;
            }
        }
    });

    return { keys: decryptedKeys, userName };
}

// Get safe keys for UI
async function getSafeTenantKeys(tenantId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('client_provider_keys')
        .select('*')
        .eq('tenant_id', tenantId);
        
    if (error) throw error;
    
    const nonSecretFields = ['whatsapp_provider', 'whatsapp_number', 'whatsapp_phone_id'];
    return data.map(k => {
        let status = 'connected';
        if (k.api_key_encrypted) {
            try {
                const decryptedStr = decrypt(k.api_key_encrypted);
                if (decryptedStr.trim().startsWith('{')) {
                    const parsed = JSON.parse(decryptedStr);
                    if (parsed.status === 'needs_reconnection') {
                        status = 'needs_reconnection';
                    }
                }
            } catch (err) {
                // If it fails decrypting due to key change, it strictly needs reconnection!
                status = 'needs_reconnection';
            }
        }

        if (nonSecretFields.includes(k.provider_name)) {
            return {
                ...k,
                status,
                api_key_decrypted: k.api_key_encrypted ? decrypt(k.api_key_encrypted) : ''
            };
        }
        return {
            ...k,
            status,
            api_key_decrypted: k.api_key_encrypted ? '[Configured - Hidden for Security]' : ''
        };
    });
}

// Upsert tenant keys
async function upsertTenantKey(tenantId, providerType, providerName, apiKeyPlaintext) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    if (!apiKeyPlaintext || apiKeyPlaintext === '[Configured - Hidden for Security]') {
         return { ignored: true };
    }
    
    const api_key_encrypted = encrypt(apiKeyPlaintext);
    
    const { data: existing, error: existingError } = await supabase
        .from('client_provider_keys')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider_name', providerName)
        .maybeSingle();

    if (existingError) throw existingError;

    let result;
    if (existing) {
        result = await supabase.from('client_provider_keys')
            .update({ api_key_encrypted, updated_at: new Date().toISOString() })
            .eq('id', existing.id).select().single();
    } else {
        result = await supabase.from('client_provider_keys')
            .insert([{
                tenant_id: tenantId,
                provider_type: providerType,
                provider_name: providerName,
                api_key_encrypted
            }]).select().single();
    }
    
    if (result.error) throw result.error;
    return result.data;
}

module.exports = {
    saveLegacyCredentials,
    getDecryptedTenantKeys,
    getSafeTenantKeys,
    upsertTenantKey
};
