'use strict';

class ITenantRepository {
    async findById(tenantId) {
        throw new Error('ITenantRepository.findById() must be implemented');
    }
}

module.exports = { ITenantRepository };
