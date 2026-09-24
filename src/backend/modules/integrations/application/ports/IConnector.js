'use strict';

/**
 * IConnector — port interface that every integration connector must implement.
 * Adding a new connector = one file implementing this interface.
 */
class IConnector {
  /** @returns {string} Provider identifier, e.g. 'stripe', 'tally' */
  get id() { throw new Error('IConnector.id must be implemented'); }

  /** @returns {string} Category, e.g. 'payments', 'forms', 'scheduling' */
  get category() { throw new Error('IConnector.category must be implemented'); }

  /** @returns {'apikey'|'oauth'|'nango'} Auth mechanism */
  get auth() { throw new Error('IConnector.auth must be implemented'); }

  /** @returns {string[]} Canonical entity types this connector can produce */
  get capabilities() { throw new Error('IConnector.capabilities must be implemented'); }

  /**
   * Verify the webhook signature. MUST fail closed — if verification
   * cannot be performed, throw. Never silently accept.
   * @param {Buffer} rawBody
   * @param {object} headers
   * @param {string} secret
   * @returns {boolean} true if valid
   * @throws {Error} if invalid or cannot verify
   */
  verifySignature(rawBody, headers, secret) {
    throw new Error('IConnector.verifySignature() must be implemented');
  }

  /**
   * Parse a verified webhook payload into canonical events.
   * @param {object} payload — parsed JSON body
   * @param {string} organizationId — UUID of the owning organization
   * @returns {import('../../domain/CanonicalEvent').CanonicalEvent[]}
   */
  parseWebhook(payload, organizationId) {
    throw new Error('IConnector.parseWebhook() must be implemented');
  }

  /**
   * Pull historical data from the provider API.
   * @param {object} credentials — decrypted API keys/tokens
   * @param {Date} since — fetch records after this date
   * @returns {import('../../domain/CanonicalEvent').CanonicalEvent[]}
   */
  async backfill(credentials, since, organizationId) {
    throw new Error('IConnector.backfill() must be implemented');
  }

  /**
   * Check if the credentials are valid and the provider is reachable.
   * @param {object} credentials
   * @returns {{ ok: boolean, message: string }}
   */
  async healthCheck(credentials) {
    throw new Error('IConnector.healthCheck() must be implemented');
  }
}

module.exports = { IConnector };
