'use strict';

const { IKeyRepository } = require('../../application/ports/IKeyRepository');
const { decrypt }        = require('../../../../infrastructure/services/encryptionService');

class SupabaseKeyRepository extends IKeyRepository {
    constructor(supabaseClient) {
        super();
        this.client = supabaseClient;
    }

    async findDecryptedKeysByTenantId(tenantId) {
        const { data, error } = await this.client
            .from('client_provider_keys')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;

        return (data ?? []).reduce((acc, row) => {
            acc[row.provider_name] = decrypt(row.api_key_encrypted);
            return acc;
        }, {});
    }

    // webhook_secret_token is stored unencrypted per-tenant per-provider — it's
    // the signing secret for that tenant's webhook endpoint, not a credential
    // used to call out to the provider, so it doesn't go through decrypt().
    async findWebhookSecretsByTenantId(tenantId) {
        const { data, error } = await this.client
            .from('client_provider_keys')
            .select('provider_name, webhook_secret_token')
            .eq('tenant_id', tenantId);

        if (error) throw error;

        return (data ?? []).reduce((acc, row) => {
            if (row.webhook_secret_token) acc[row.provider_name] = row.webhook_secret_token;
            return acc;
        }, {});
    }
}

module.exports = { SupabaseKeyRepository };
