'use strict';

const { AppError } = require('../../../../shared/errors/AppError');

class TenantNotFoundError extends AppError {
    constructor(tenantId) {
        super(`Tenant not found: ${tenantId}`, 404, 'TENANT_NOT_FOUND');
        this.name     = 'TenantNotFoundError';
        this.tenantId = tenantId;
    }
}

module.exports = { TenantNotFoundError };
