'use strict';

const { AppError } = require('../../../../shared/errors/AppError');

class ProviderNotSupportedError extends AppError {
    constructor(provider) {
        super(`Provider not supported: ${provider}`, 400, 'PROVIDER_NOT_SUPPORTED');
        this.name     = 'ProviderNotSupportedError';
        this.provider = provider;
    }
}

module.exports = { ProviderNotSupportedError };
