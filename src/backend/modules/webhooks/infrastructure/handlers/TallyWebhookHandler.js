'use strict';

const crypto = require('crypto');
const { IWebhookHandler } = require('../../application/ports/IWebhookHandler');
const { AppError } = require('../../../../shared/errors/AppError');

class TallyWebhookHandler extends IWebhookHandler {
    // Tally signs webhook deliveries with a `Tally-Signature` header: base64
    // HMAC-SHA256 of the raw request body, keyed by the signing secret you set
    // when creating the webhook in Tally's dashboard (https://tally.so — Settings
    // > Webhooks > Signing secret). Reuses the same webhook_secret_token column
    // and per-tenant convention already built for Stripe, just a different
    // provider_name row ('tally').
    async handle(event, { decryptedKeys, webhookSecrets, tenant, ingestionDispatcher, connectorRegistry }) {
        // ── Signature Verification (unchanged) ────────────────────────────
        const webhookSecret = webhookSecrets?.tally;
        if (!webhookSecret) {
            throw new AppError(
                `No webhook_secret_token configured for tenant ${event.tenantId} (provider: tally)`,
                500,
                'WEBHOOK_NOT_CONFIGURED'
            );
        }
        if (!event.signature || !event.rawBody) {
            throw new AppError('Missing Tally-Signature header', 400, 'MISSING_SIGNATURE');
        }

        const expected = crypto.createHmac('sha256', webhookSecret).update(event.rawBody).digest('base64');
        const provided = Buffer.from(event.signature, 'utf8');
        const expectedBuf = Buffer.from(expected, 'utf8');
        const valid = provided.length === expectedBuf.length && crypto.timingSafeEqual(provided, expectedBuf);
        if (!valid) {
            throw new AppError('Invalid Tally signature', 400, 'INVALID_SIGNATURE');
        }

        // ── Existing Behavior (unchanged) ─────────────────────────────────
        console.log(`[TallyHandler] Verified and routed Tally event to CRM Agent for tenant ${event.tenantId}`);

        // ── Canonical Ingestion (additive — does NOT change above) ────────
        if (ingestionDispatcher && connectorRegistry?.has('tally')) {
            if (tenant?.organizationId) {
                try {
                    const connector = connectorRegistry.resolve('tally');
                    const canonicalEvents = connector.parseWebhook(event.payload, tenant.organizationId);
                    if (canonicalEvents.length > 0) {
                        const result = await ingestionDispatcher.ingest(canonicalEvents);
                        console.log(`[TallyHandler] Canonical ingestion: ${result.ingested} ingested, ${result.failed} failed`);
                    }
                } catch (ingestionErr) {
                    // Canonical ingestion failure must NOT break the existing flow.
                    console.error(`[TallyHandler] Canonical ingestion error (non-fatal): ${ingestionErr.message}`);
                }
            } else {
                console.warn(`[TallyHandler] WARNING: Canonical ingestion skipped for tenant ${event.tenantId} because tenant.organizationId is null.`);
            }
        }
    }
}

module.exports = { TallyWebhookHandler };
