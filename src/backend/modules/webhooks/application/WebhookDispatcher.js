'use strict';

const { WebhookEvent } = require('../domain/WebhookEvent');

class WebhookDispatcher {
    constructor({ tenantRepository, keyRepository, handlerRegistry, ingestionDispatcher, connectorRegistry }) {
        this._tenantRepository    = tenantRepository;
        this._keyRepository       = keyRepository;
        this._handlerRegistry     = handlerRegistry;
        this._ingestionDispatcher = ingestionDispatcher || null;
        this._connectorRegistry   = connectorRegistry || null;
    }

    async dispatch({ tenantId, provider, payload, rawBody, signature }) {
        const event = new WebhookEvent({ tenantId, provider, payload, rawBody, signature });

        console.log(`[WebhookDispatcher] Received ${event}`);

        const handler = this._handlerRegistry.resolve(event.provider);

        const [tenant, decryptedKeys, webhookSecrets] = await Promise.all([
            this._tenantRepository.findById(tenantId),
            this._keyRepository.findDecryptedKeysByTenantId(tenantId),
            this._keyRepository.findWebhookSecretsByTenantId(tenantId),
        ]);

        // Pass ingestion dependencies to the handler so it can write canonical
        // events after its existing processing. The handler is free to ignore
        // these if it doesn't support canonical ingestion yet.
        await handler.handle(event, {
            decryptedKeys,
            webhookSecrets,
            tenant,
            ingestionDispatcher: this._ingestionDispatcher,
            connectorRegistry:   this._connectorRegistry,
        });

        console.log(`[WebhookDispatcher] Dispatched ${event} for ${tenant}`);
    }
}

module.exports = { WebhookDispatcher };
