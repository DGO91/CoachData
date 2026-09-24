'use strict';

class IWebhookHandler {
    /**
     * @param {import('../../domain/WebhookEvent').WebhookEvent} event
     * @param {{ decryptedKeys: Record<string, string>, webhookSecrets: Record<string, string> }} keys
     */
    async handle(event, keys) {
        throw new Error('IWebhookHandler.handle() must be implemented');
    }
}

module.exports = { IWebhookHandler };
