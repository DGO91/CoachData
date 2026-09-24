'use strict';

const crypto = require('crypto');
const { IConnector }     = require('../../application/ports/IConnector');
const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes }    = require('../../domain/EntityTypes');
const { AppError }       = require('../../../../shared/errors/AppError');

/**
 * WhatsAppCloudConnector — maps Official Meta/WhatsApp Cloud API webhooks to canonical entities.
 *
 * Capabilities: ['contacts', 'messaging', 'sessions']
 * Header verification: x-hub-signature-256 (HMAC-SHA256 with App Secret)
 */
class WhatsAppCloudConnector extends IConnector {
  get id() { return 'whatsapp_cloud'; }
  get category() { return 'messaging'; }
  get auth() { return 'bearer'; }
  get capabilities() { return ['contacts', 'messaging', 'sessions']; }

  /**
   * Verify Meta signature header 'x-hub-signature-256' against rawBody using app secret.
   */
  verifySignature(rawBody, headers, secret) {
    if (!secret) {
      throw new AppError('No WhatsApp Cloud App secret configured', 500, 'WEBHOOK_NOT_CONFIGURED');
    }

    const signature = headers['x-hub-signature-256'];
    if (!signature || !rawBody) {
      throw new AppError('Missing x-hub-signature-256 header or body', 400, 'MISSING_SIGNATURE');
    }

    const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const expectedHash = crypto.createHmac('sha256', secret).update(rawBodyStr).digest('hex');
    const expected = `sha256=${expectedHash}`;

    const providedBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new AppError('Invalid Meta WhatsApp Cloud signature', 400, 'INVALID_SIGNATURE');
    }

    return true;
  }

  /**
   * Parse Meta WhatsApp Cloud API payload into canonical events.
   *
   * Sample payload structure from Meta Cloud API:
   * {
   *   "object": "whatsapp_business_account",
   *   "entry": [{
   *     "id": "ACCOUNT_ID",
   *     "changes": [{
   *       "value": {
   *         "messaging_product": "whatsapp",
   *         "contacts": [{ "profile": { "name": "Client Name" }, "wa_id": "34600000000" }],
   *         "messages": [{ "from": "34600000000", "id": "wamid.HBgL...", "timestamp": "1786636000", "text": { "body": "Hello" } }]
   *       }
   *     }]
   *   }]
   * }
   */
  parseWebhook(payload, organizationId) {
    const events = [];
    if (!payload || !Array.isArray(payload.entry)) return events;

    for (const entry of payload.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val || val.messaging_product !== 'whatsapp') continue;

        const contacts = val.contacts || [];
        const messages = val.messages || [];

        const contactNameMap = new Map();
        for (const contact of contacts) {
          const phone = contact.wa_id;
          const name = contact.profile?.name || null;
          if (phone) contactNameMap.set(phone, name);

          events.push(new CanonicalEvent({
            entityType:     EntityTypes.CONTACT,
            organizationId,
            sourceProvider: 'whatsapp_cloud',
            sourceId:       `wa_contact_${phone}`,
            fields: {
              phone: `+${phone}`,
              full_name: name,
            },
            rawPayload: payload,
            occurredAt: new Date(),
          }));
        }

        for (const msg of messages) {
          const fromPhone = msg.from;
          const senderName = contactNameMap.get(fromPhone) || null;
          const msgText = msg.text?.body || msg.button?.text || msg.interactive?.button_reply?.title || 'Mensaje de WhatsApp';
          const occurredAt = msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date();

          events.push(new CanonicalEvent({
            entityType:     EntityTypes.FORM_ENTRY,
            organizationId,
            sourceProvider: 'whatsapp_cloud',
            sourceId:       msg.id || `wa_msg_${Date.now()}`,
            fields: {
              form_name:     'WhatsApp Direct Message',
              respondent_name: senderName,
              respondent_email: `${fromPhone}@whatsapp.com`,
              answers:       { text: msgText, phone: `+${fromPhone}`, message_type: msg.type },
            },
            rawPayload: payload,
            occurredAt,
          }));
        }
      }
    }

    return events;
  }

  async backfill(credentials, since) {
    return [];
  }

  async healthCheck(credentials) {
    if (credentials?.whatsapp_cloud_secret) {
      return { ok: true, message: 'WhatsApp Cloud credentials configured' };
    }
    return { ok: false, message: 'No WhatsApp Cloud credentials configured' };
  }
}

module.exports = { WhatsAppCloudConnector };
