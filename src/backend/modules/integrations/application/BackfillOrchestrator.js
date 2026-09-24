'use strict';

const { ConnectorRegistry } = require('./ConnectorRegistry');
const { IngestionDispatcher } = require('./IngestionDispatcher');
const { OutboundWebhookDispatcher } = require('./OutboundWebhookDispatcher');

/**
 * BackfillOrchestrator — triggers historical data import after a provider connection.
 *
 * When a coach connects a tool (via Nango OAuth or API key), this orchestrator:
 * 1. Resolves the connector from the registry
 * 2. Retrieves the decrypted credentials
 * 3. Calls connector.backfill(credentials, since)
 * 4. Feeds the resulting CanonicalEvents into IngestionDispatcher
 * 5. Optionally dispatches each event to outbound webhooks
 */
class BackfillOrchestrator {
  /**
   * @param {object} deps
   * @param {ConnectorRegistry} deps.connectorRegistry
   * @param {IngestionDispatcher} deps.ingestionDispatcher
   * @param {OutboundWebhookDispatcher} [deps.outboundDispatcher]
   */
  constructor({ connectorRegistry, ingestionDispatcher, outboundDispatcher }) {
    this._registry = connectorRegistry;
    this._ingestion = ingestionDispatcher;
    this._outbound = outboundDispatcher || null;
  }

  /**
   * Run backfill for a specific provider and organization.
   *
   * @param {string} providerId — e.g. 'stripe', 'calendly', 'tally'
   * @param {string} organizationId — UUID of the tenant
   * @param {object} credentials — decrypted keys/tokens for the provider
   * @param {object} [options]
   * @param {Date}   [options.since] — only fetch records after this date (default: 90 days ago)
   * @param {boolean} [options.emitOutbound] — also dispatch events to outbound webhooks
   * @returns {Promise<{ provider: string, ingested: number, failed: number, durationMs: number }>}
   */
  async runBackfill(providerId, organizationId, credentials, options = {}) {
    const start = Date.now();
    const since = options.since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days default

    console.log(`[BackfillOrchestrator] Starting backfill for ${providerId} / org ${organizationId} since ${since.toISOString()}`);

    if (!this._registry.has(providerId)) {
      console.warn(`[BackfillOrchestrator] No connector registered for provider: ${providerId}`);
      return { provider: providerId, ingested: 0, failed: 0, durationMs: Date.now() - start };
    }

    const connector = this._registry.resolve(providerId);

    let events = [];
    try {
      events = await connector.backfill(credentials, since, organizationId);
    } catch (err) {
      console.error(`[BackfillOrchestrator] backfill() failed for ${providerId}:`, err.message);
      return { provider: providerId, ingested: 0, failed: 0, durationMs: Date.now() - start, error: err.message };
    }

    if (!Array.isArray(events) || events.length === 0) {
      console.log(`[BackfillOrchestrator] No historical data returned for ${providerId}`);
      return { provider: providerId, ingested: 0, failed: 0, durationMs: Date.now() - start };
    }

    // Ensure all events have the correct organizationId
    for (const event of events) {
      if (!event.organizationId) {
        event.organizationId = organizationId;
      }
    }

    console.log(`[BackfillOrchestrator] ${providerId} returned ${events.length} historical events, ingesting...`);

    const result = await this._ingestion.ingest(events);

    // Optionally dispatch to outbound webhooks
    if (options.emitOutbound && this._outbound && result.ingested > 0) {
      for (const event of events) {
        try {
          await this._outbound.dispatchEvent(organizationId, event);
        } catch (err) {
          // Outbound failure must not abort the backfill
          console.error(`[BackfillOrchestrator] Outbound dispatch failed for event ${event.sourceId}:`, err.message);
        }
      }
    }

    const durationMs = Date.now() - start;
    console.log(`[BackfillOrchestrator] Backfill complete for ${providerId}: ${result.ingested} ingested, ${result.failed} failed (${durationMs}ms)`);

    return { provider: providerId, ...result, durationMs };
  }
}

module.exports = { BackfillOrchestrator };
