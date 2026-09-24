'use strict';

const { IWebhookHandler } = require('../../application/ports/IWebhookHandler');
const { AppError } = require('../../../../shared/errors/AppError');

/**
 * CalendlyWebhookHandler — verifies signature, enriches the payload with
 * event details from the Calendly API (start/end times), then dispatches
 * to the canonical ingestion layer.
 *
 * For invitee.canceled, updates the existing canonical_session row directly
 * instead of going through IngestionDispatcher (which uses ignoreDuplicates
 * and would skip the duplicate instead of updating it).
 */
class CalendlyWebhookHandler extends IWebhookHandler {
    async handle(event, { decryptedKeys, webhookSecrets, tenant, ingestionDispatcher, connectorRegistry }) {
        // ── Signature Verification ────────────────────────────────────────
        const webhookSecret = webhookSecrets?.calendly;
        if (!webhookSecret) {
            throw new AppError(
                `No webhook_secret_token configured for tenant ${event.tenantId} (provider: calendly)`,
                500,
                'WEBHOOK_NOT_CONFIGURED'
            );
        }
        if (!event.signature || !event.rawBody) {
            throw new AppError('Missing Calendly-Webhook-Signature header', 400, 'MISSING_SIGNATURE');
        }

        // Delegate to connector's verifySignature (which includes timestamp validation)
        const connector = connectorRegistry.resolve('calendly');
        connector.verifySignature(event.rawBody, { 'calendly-webhook-signature': event.signature }, webhookSecret);

        console.log(`[CalendlyHandler] Verified Calendly webhook for tenant ${event.tenantId} (event: ${event.payload?.event})`);

        // ── Enrichment: fetch start_time/end_time from Calendly API ──────
        const webhookType = event.payload?.event;
        const invitee = event.payload?.payload;

        if (invitee && invitee.event && webhookType === 'invitee.created') {
            const enriched = await this._enrichEventDetails(invitee.event, decryptedKeys);
            if (enriched) {
                event.payload._enriched = enriched;
            }
        }

        // ── Canonical Ingestion ──────────────────────────────────────────
        if (!ingestionDispatcher || !connectorRegistry?.has('calendly')) return;
        if (!tenant?.organizationId) {
            console.warn(`[CalendlyHandler] WARNING: Canonical ingestion skipped for tenant ${event.tenantId} because tenant.organizationId is null.`);
            return;
        }

        try {
            if (webhookType === 'invitee.canceled') {
                // For cancellations, update the existing row directly instead of
                // going through IngestionDispatcher (which uses ignoreDuplicates: true
                // and would silently skip the update).
                await this._handleCancellation(event.payload, tenant.organizationId, ingestionDispatcher);
            } else {
                // Normal ingestion for invitee.created
                const canonicalEvents = connector.parseWebhook(event.payload, tenant.organizationId);
                if (canonicalEvents.length > 0) {
                    const result = await ingestionDispatcher.ingest(canonicalEvents);
                    console.log(`[CalendlyHandler] Canonical ingestion: ${result.ingested} ingested, ${result.failed} failed`);
                }
            }
        } catch (ingestionErr) {
            if (ingestionErr instanceof AppError || ingestionErr.code === 'CALENDLY_ENRICHMENT_REQUIRED') {
                throw ingestionErr;
            }
            console.error(`[CalendlyHandler] Canonical ingestion error (non-fatal): ${ingestionErr.message}`);
        }
    }

    /**
     * Fetch event details from Calendly API to get start_time, end_time,
     * and event type name. Uses the Nango connection_id stored as the
     * decrypted key for 'calendly'.
     *
     * @param {string} eventUri — e.g. 'https://api.calendly.com/scheduled_events/XXXX'
     * @param {object} decryptedKeys — tenant's decrypted credentials
     * @returns {{ start_time: string, end_time: string, event_type_name: string } | null}
     */
    async _enrichEventDetails(eventUri, decryptedKeys) {
        try {
            // The calendly key is a Nango connection_id; we need to get the actual
            // access token from Nango to call the Calendly API
            const connectionId = decryptedKeys?.calendly;
            if (!connectionId) {
                throw new AppError('No Calendly connection_id in decrypted keys', 500, 'CALENDLY_ENRICHMENT_FAILED');
            }

            const nangoSecretKey = process.env.NANGO_SECRET_KEY;
            if (!nangoSecretKey) {
                throw new AppError('NANGO_SECRET_KEY not configured', 500, 'CALENDLY_ENRICHMENT_FAILED');
            }

            // Fetch the access token from Nango
            const tokenRes = await fetch(
                `https://api.nango.dev/connection/${connectionId}?provider_config_key=calendly`,
                {
                    headers: { 'Authorization': `Bearer ${nangoSecretKey}` },
                }
            );

            if (!tokenRes.ok) {
                throw new AppError(`Failed to fetch Nango token (HTTP ${tokenRes.status})`, 502, 'CALENDLY_ENRICHMENT_FAILED');
            }

            const tokenData = await tokenRes.json();
            const accessToken = tokenData?.credentials?.access_token;
            if (!accessToken) {
                throw new AppError('No access_token returned from Nango', 502, 'CALENDLY_ENRICHMENT_FAILED');
            }

            // Fetch the scheduled event details from Calendly
            const eventRes = await fetch(eventUri, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (!eventRes.ok) {
                throw new AppError(`Failed to fetch Calendly event details (HTTP ${eventRes.status})`, 502, 'CALENDLY_ENRICHMENT_FAILED');
            }

            const eventData = await eventRes.json();
            const resource = eventData?.resource;

            if (!resource?.start_time) {
                throw new AppError('Calendly event did not return start_time', 502, 'CALENDLY_ENRICHMENT_FAILED');
            }

            return {
                start_time: resource.start_time,
                end_time: resource?.end_time || null,
                event_type_name: resource?.name || resource?.event_type?.name || 'Unknown',
            };
        } catch (err) {
            if (err instanceof AppError) {
                throw err;
            }
            throw new AppError(`Calendly enrichment failed: ${err.message}`, 502, 'CALENDLY_ENRICHMENT_FAILED');
        }
    }

    /**
     * Handle invitee.canceled by updating the existing canonical_session row.
     * Does NOT delete the row — preserves the historic record with a cancellation
     * marker in the raw_payload.
     */
    async _handleCancellation(payload, organizationId, ingestionDispatcher) {
        const invitee = payload?.payload;
        if (!invitee?.uri) return;

        const sourceId = invitee.uri;
        const repo = ingestionDispatcher._repo;
        if (!repo?._client) {
            console.warn('[CalendlyHandler] Cannot process cancellation — no repository client available.');
            return;
        }

        const { error } = await repo._client
            .from('canonical_session')
            .update({
                raw_payload: { ...payload, _canceled: true },
                occurred_at: payload.created_at ? new Date(payload.created_at).toISOString() : new Date().toISOString(),
            })
            .eq('organization_id', organizationId)
            .eq('source_provider', 'calendly')
            .eq('source_id', sourceId);

        if (error) {
            console.error(`[CalendlyHandler] Failed to update cancellation for source_id ${sourceId}: ${error.message}`);
        } else {
            console.log(`[CalendlyHandler] Session ${sourceId} marked as canceled.`);
        }
    }
}

module.exports = { CalendlyWebhookHandler };
