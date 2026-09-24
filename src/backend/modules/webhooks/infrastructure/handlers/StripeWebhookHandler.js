'use strict';

const Stripe = require('stripe');
const { IWebhookHandler } = require('../../application/ports/IWebhookHandler');
const { AppError } = require('../../../../shared/errors/AppError');
const IS_DOCKER = process.env.DOCKER_ENV === 'true';

class StripeWebhookHandler extends IWebhookHandler {
    async handle(event, { decryptedKeys, webhookSecrets, tenant, ingestionDispatcher, connectorRegistry }) {
        // ── Signature Verification (unchanged) ────────────────────────────
        // Fail closed: no secret configured or a bad signature must reject the
        // event, never fall through to forwarding it as if it were verified.
        const webhookSecret = webhookSecrets?.stripe;
        if (!webhookSecret) {
            throw new AppError(
                `No webhook_secret_token configured for tenant ${event.tenantId}`,
                500,
                'WEBHOOK_NOT_CONFIGURED'
            );
        }
        if (!event.signature || !event.rawBody) {
            throw new AppError('Missing Stripe signature', 400, 'MISSING_SIGNATURE');
        }
        try {
            new Stripe(webhookSecret).webhooks.constructEvent(event.rawBody, event.signature, webhookSecret);
        } catch (sigErr) {
            throw new AppError(`Invalid Stripe signature: ${sigErr.message}`, 400, 'INVALID_SIGNATURE');
        }

        // ── Existing Behavior: Forward to Onboarding Agent (unchanged) ────
        const hostname = IS_DOCKER ? 'coachdata_agent_prospect' : 'localhost';
        const url = `http://${hostname}:4002/api/process-payment`;

        console.log(`[StripeHandler] Forwarding to Onboarding Agent -> ${url}`);

        const response = await fetch(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                payload: event.payload,
                keys:    decryptedKeys,
            }),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`[StripeHandler] Onboarding Agent responded ${response.status}: ${body}`);
        }

        console.log(`[StripeHandler] Successfully forwarded Stripe event`);

        // ── Canonical Ingestion (additive — does NOT change above) ────────
        if (ingestionDispatcher && connectorRegistry?.has('stripe')) {
            if (tenant?.organizationId) {
                try {
                    const connector = connectorRegistry.resolve('stripe');
                    const canonicalEvents = connector.parseWebhook(event.payload, tenant.organizationId);
                    if (canonicalEvents.length > 0) {
                        const result = await ingestionDispatcher.ingest(canonicalEvents);
                        console.log(`[StripeHandler] Canonical ingestion: ${result.ingested} ingested, ${result.failed} failed`);
                    }
                } catch (ingestionErr) {
                    // Canonical ingestion failure must NOT break the existing flow.
                    console.error(`[StripeHandler] Canonical ingestion error (non-fatal): ${ingestionErr.message}`);
                }
            } else {
                console.warn(`[StripeHandler] WARNING: Canonical ingestion skipped for tenant ${event.tenantId} because tenant.organizationId is null.`);
            }
        }
    }
}

module.exports = { StripeWebhookHandler };
