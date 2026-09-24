'use strict';

/**
 * IngestionDispatcher — receives CanonicalEvent[] and routes each to the
 * appropriate table via the repository's upsert(). Never duplicates, because
 * the repository uses the unique index (organization_id, source_provider, source_id).
 */
class IngestionDispatcher {
  /**
   * @param {object} deps
   * @param {import('./ports/ICanonicalRepository').ICanonicalRepository} deps.canonicalRepository
   */
  constructor({ canonicalRepository }) {
    if (!canonicalRepository || typeof canonicalRepository.upsert !== 'function') {
      throw new Error('IngestionDispatcher requires a canonicalRepository with upsert()');
    }
    this._repo = canonicalRepository;
  }

  /**
   * Ingest an array of canonical events. Each event is upserted independently.
   * Errors on individual events are logged but do not abort the batch —
   * partial ingestion is better than no ingestion.
   *
   * @param {import('../domain/CanonicalEvent').CanonicalEvent[]} events
   * @returns {Promise<{ ingested: number, failed: number }>}
   */
  async ingest(events) {
    if (!Array.isArray(events) || events.length === 0) {
      return { ingested: 0, failed: 0 };
    }

    let ingested = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this._repo.upsert(event);
        ingested++;
        console.log(`[IngestionDispatcher] Ingested ${event}`);
      } catch (err) {
        failed++;
        console.error(`[IngestionDispatcher] Failed to ingest ${event}: ${err.message}`);
      }
    }

    return { ingested, failed };
  }
}

module.exports = { IngestionDispatcher };
