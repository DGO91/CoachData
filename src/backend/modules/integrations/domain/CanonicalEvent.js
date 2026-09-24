'use strict';

const { EntityTypes } = require('./EntityTypes');

/**
 * CanonicalEvent — immutable value object emitted by every connector's
 * parseWebhook() and backfill() methods. Represents one row to write
 * into one of the four canonical tables.
 */
class CanonicalEvent {
  /**
   * @param {object} params
   * @param {'contact'|'payment'|'session'|'form_entry'} params.entityType
   * @param {string} params.organizationId  — UUID of the owning organization
   * @param {string} params.sourceProvider  — e.g. 'stripe', 'tally'
   * @param {string} params.sourceId        — the id in the source tool
   * @param {object} params.fields          — entity-specific mapped fields
   * @param {object} params.rawPayload      — untransformed source data
   * @param {Date|null} [params.occurredAt] — when it happened in the source
   */
  constructor({ entityType, organizationId, sourceProvider, sourceId, fields, rawPayload, occurredAt }) {
    if (!entityType || !Object.values(EntityTypes).includes(entityType)) {
      throw new Error(`CanonicalEvent requires a valid entityType, got: '${entityType}'`);
    }
    if (!organizationId) throw new Error('CanonicalEvent requires organizationId');
    if (!sourceProvider) throw new Error('CanonicalEvent requires sourceProvider');
    if (!sourceId) throw new Error('CanonicalEvent requires sourceId');
    if (!rawPayload || typeof rawPayload !== 'object') {
      throw new Error('CanonicalEvent requires rawPayload as an object');
    }

    this.entityType     = entityType;
    this.organizationId = organizationId;
    this.sourceProvider = sourceProvider.toLowerCase();
    this.sourceId       = String(sourceId);
    this.fields         = Object.freeze({ ...(fields || {}) });
    this.rawPayload     = rawPayload;
    this.occurredAt     = occurredAt instanceof Date ? occurredAt : (occurredAt ? new Date(occurredAt) : null);
  }

  /**
   * Builds the row object ready for Supabase upsert.
   * Merges common columns with entity-specific fields.
   */
  toRow() {
    return {
      organization_id: this.organizationId,
      source_provider: this.sourceProvider,
      source_id:       this.sourceId,
      raw_payload:     this.rawPayload,
      occurred_at:     this.occurredAt?.toISOString() || null,
      ...this.fields,
    };
  }

  toString() {
    return `CanonicalEvent[${this.entityType}] ${this.sourceProvider}:${this.sourceId} org=${this.organizationId}`;
  }
}

module.exports = { CanonicalEvent };
