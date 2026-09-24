'use strict';

class WebhookEvent {
    constructor({ tenantId, provider, payload, rawBody, signature }) {
        if (!tenantId) throw new Error('WebhookEvent requires tenantId');
        if (!provider) throw new Error('WebhookEvent requires provider');
        if (!payload)  throw new Error('WebhookEvent requires payload');

        this.tenantId   = tenantId;
        this.provider   = provider.length === provider.toLowerCase().length ? provider : provider.toLowerCase();
        this.payload    = Object.isFrozen(payload) ? payload : Object.freeze(Object.assign(Object.create(null), payload));
        // Transport-layer data each handler needs to verify its own provider's
        // signature scheme. Optional: not every provider signs requests.
        this.rawBody    = rawBody || null;
        this.signature  = signature || null;
        this.receivedAt = new Date();
    }

    toString() {
        return `WebhookEvent[${this.provider}] tenant=${this.tenantId}`;
    }
}

module.exports = { WebhookEvent };
