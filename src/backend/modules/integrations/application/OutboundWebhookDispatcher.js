'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');

/**
 * OutboundWebhookDispatcher — dispatches canonical events to outbound webhook URLs configured per organization.
 *
 * Emits HTTP POST signed with HMAC-SHA256 signature header 'X-CoachData-Signature'.
 */
class OutboundWebhookDispatcher {
  /**
   * @param {object} options
   * @param {import('@supabase/supabase-js').SupabaseClient} [options.supabaseClient]
   */
  constructor({ supabaseClient } = {}) {
    this._supabase = supabaseClient;
  }

  /**
   * Send a canonical event to registered outbound webhook URLs for the organization.
   *
   * @param {string} organizationId
   * @param {import('../domain/CanonicalEvent').CanonicalEvent} event
   * @param {string} [customTargetUrl] - Optional target URL override for instant testing
   * @param {string} [customSecret] - Secret for customTargetUrl. Required with it.
   */
  async dispatchEvent(organizationId, event, customTargetUrl = null, customSecret = null) {
    if (!organizationId && !customTargetUrl) return;

    let targetUrls = [];

    if (customTargetUrl) {
      if (!customSecret) {
        throw new Error('[OutboundWebhookDispatcher] customTargetUrl requiere customSecret.');
      }
      targetUrls.push({ url: customTargetUrl, secret: customSecret });
    } else if (this._supabase) {
      try {
        const { data } = await this._supabase
          .from('organizations')
          .select('settings_json')
          .eq('id', organizationId)
          .maybeSingle();

        const webhooks = data?.settings_json?.outbound_webhooks || [];
        targetUrls = webhooks.filter(w => w.active && w.url);
      } catch (err) {
        console.error('[OutboundWebhookDispatcher] Failed to fetch organization webhooks:', err.message);
      }
    }

    if (targetUrls.length === 0) return;

    const payloadStr = JSON.stringify({
      event_type: `canonical.${event.entityType}`,
      organization_id: organizationId,
      source_provider: event.sourceProvider,
      source_id: event.sourceId,
      fields: event.fields,
      occurred_at: event.occurredAt,
      timestamp: new Date().toISOString(),
    });

    for (const webhook of targetUrls) {
      // Sin secreto propio no se envía. Antes se firmaba con un literal común a
      // todas las organizaciones, publicado en el repositorio: el receptor no
      // podía distinguir un evento nuestro de uno falsificado.
      const secret = webhook.secret;
      if (!secret) {
        console.error(`[OutboundWebhookDispatcher] Webhook sin secreto, no se envía: ${webhook.url}`);
        continue;
      }
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      try {
        await this._sendPost(webhook.url, payloadStr, {
          'Content-Type': 'application/json',
          'X-CoachData-Signature': `sha256=${signature}`,
          'User-Agent': 'CoachData-OS-OutboundWebhook/2.0',
        });
      } catch (err) {
        console.error(`[OutboundWebhookDispatcher] Failed to deliver webhook to ${webhook.url}:`, err.message);
      }
    }
  }

  /** Secreto nuevo para un webhook saliente. Úsalo al darlo de alta. */
  static generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  _sendPost(urlStr, payload, headers) {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(urlStr);
        const transport = url.protocol === 'https:' ? https : http;
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers,
          timeout: 5000,
        };

        const req = transport.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ statusCode: res.statusCode, body });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${body}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timed out after 5000ms'));
        });

        req.write(payload);
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = { OutboundWebhookDispatcher };
