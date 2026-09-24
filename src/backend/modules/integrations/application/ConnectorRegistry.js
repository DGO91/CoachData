'use strict';

/**
 * ConnectorRegistry — lookup connectors by provider id.
 * Same pattern as HandlerRegistry in the webhooks module.
 */
class ConnectorRegistry {
  constructor() {
    this._connectors = new Map();
  }

  /**
   * Register a connector instance.
   * @param {import('./ports/IConnector').IConnector} connector
   * @returns {ConnectorRegistry} this (for chaining)
   */
  register(connector) {
    if (!connector?.id || typeof connector.id !== 'string') {
      throw new Error('ConnectorRegistry.register() requires a connector with a valid .id');
    }
    if (typeof connector.parseWebhook !== 'function') {
      throw new Error(`Connector "${connector.id}" must implement parseWebhook()`);
    }
    this._connectors.set(connector.id.toLowerCase(), connector);
    return this;
  }

  /**
   * Resolve a connector by provider id.
   * @param {string} providerId
   * @returns {import('./ports/IConnector').IConnector}
   */
  resolve(providerId) {
    const connector = this._connectors.get(providerId?.toLowerCase());
    if (!connector) {
      throw new Error(`No connector registered for provider: "${providerId}"`);
    }
    return connector;
  }

  /**
   * Check if a connector is registered for the given provider.
   * @param {string} providerId
   * @returns {boolean}
   */
  has(providerId) {
    return this._connectors.has(providerId?.toLowerCase());
  }

  /**
   * List all registered provider ids.
   * @returns {string[]}
   */
  listProviders() {
    return Array.from(this._connectors.keys());
  }
}

module.exports = { ConnectorRegistry };
