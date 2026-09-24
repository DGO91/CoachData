'use strict';

class IKeyRepository {
    async findDecryptedKeysByTenantId(tenantId) {
        throw new Error('IKeyRepository.findDecryptedKeysByTenantId() must be implemented');
    }

    async findWebhookSecretsByTenantId(tenantId) {
        throw new Error('IKeyRepository.findWebhookSecretsByTenantId() must be implemented');
    }
}

module.exports = { IKeyRepository };
