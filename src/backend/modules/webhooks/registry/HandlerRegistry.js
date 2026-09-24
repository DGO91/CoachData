'use strict';

const { ProviderNotSupportedError } = require('../domain/errors/ProviderNotSupportedError');

class HandlerRegistry {
    constructor() {
        this._handlers = new Map();
        this._providerListCache = null;
    }

    register(provider, handler) {
        if (!provider || typeof provider !== 'string') {
            throw new Error('HandlerRegistry.register() requires a valid provider name');
        }
        if (typeof handler?.handle !== 'function') {
            throw new Error(`Handler for "${provider}" must implement IWebhookHandler.handle()`);
        }

        this._handlers.set(provider.toLowerCase(), handler);
        this._providerListCache = null;
        return this;
    }

    resolve(provider) {
        const handler = this._handlers.get(provider);
        if (!handler) throw new ProviderNotSupportedError(provider);
        return handler;
    }

    listProviders() {
        if (!this._providerListCache) {
            this._providerListCache = Array.from(this._handlers.keys());
        }
        return this._providerListCache;
    }
}

module.exports = { HandlerRegistry };
