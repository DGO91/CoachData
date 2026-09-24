'use strict';

/**
 * ICanonicalRepository — port interface for persisting and querying
 * canonical events across the four entity tables.
 */
class ICanonicalRepository {
  /**
   * Upsert a canonical event into the appropriate table.
   * Uses the unique index (organization_id, source_provider, source_id)
   * for idempotency — duplicate events are silently ignored.
   *
   * @param {import('../../domain/CanonicalEvent').CanonicalEvent} event
   * @returns {Promise<void>}
   */
  async upsert(event) {
    throw new Error('ICanonicalRepository.upsert() must be implemented');
  }

  /**
   * Find canonical records by organization and entity type.
   *
   * @param {'contact'|'payment'|'session'|'form_entry'} entityType
   * @param {string} organizationId — UUID
   * @param {object} [options]
   * @param {number} [options.limit]
   * @param {string} [options.sourceProvider] — filter by provider
   * @returns {Promise<object[]>}
   */
  async findByOrg(entityType, organizationId, options = {}) {
    throw new Error('ICanonicalRepository.findByOrg() must be implemented');
  }
}

module.exports = { ICanonicalRepository };
