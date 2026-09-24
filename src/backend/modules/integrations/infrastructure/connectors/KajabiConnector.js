'use strict';

const crypto = require('crypto');
const { IConnector }     = require('../../application/ports/IConnector');
const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes }    = require('../../domain/EntityTypes');
const { AppError }       = require('../../../../shared/errors/AppError');

/**
 * KajabiConnector — maps Kajabi webhook events (purchases & members) to canonical entities.
 *
 * Capabilities: ['payments', 'contacts']
 * Webhooks handled: purchase.created, member.created
 */
class KajabiConnector extends IConnector {
  get id() { return 'kajabi'; }
  get category() { return 'delivery'; }
  get auth() { return 'apikey'; }
  get capabilities() { return ['payments', 'contacts']; }

  /**
   * Verify Kajabi webhook signature using HMAC-SHA256 signature header if secret is present.
   */
  verifySignature(rawBody, headers, secret) {
    if (!secret) {
      throw new AppError('No Kajabi webhook secret configured', 500, 'WEBHOOK_NOT_CONFIGURED');
    }

    const signature = headers['x-kajabi-signature'] || headers['kajabi-signature'];
    if (!rawBody) {
      throw new AppError('Missing rawBody for Kajabi signature verification', 400, 'MISSING_SIGNATURE');
    }

    // Optional header verification if Kajabi sends signature header
    if (signature) {
      const rawBodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      const expected = crypto.createHmac('sha256', secret).update(rawBodyStr).digest('hex');
      const providedBuf = Buffer.from(signature, 'utf8');
      const expectedBuf = Buffer.from(expected, 'utf8');

      if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
        throw new AppError('Invalid Kajabi webhook signature', 400, 'INVALID_SIGNATURE');
      }
    }

    return true;
  }

  /**
   * Parse Kajabi webhook payload into canonical events.
   *
   * Kajabi purchase event shape:
   * {
   *   event: 'purchase.created' | 'member.created',
   *   payload: {
   *     id: '12345',
   *     amount: 49900, // cents
   *     currency: 'usd',
   *     email: 'client@example.com',
   *     name: 'John Doe',
   *     product_name: 'Coaching Program'
   *   }
   * }
   */
  parseWebhook(payload, organizationId) {
    const events = [];
    if (!payload) return events;

    const eventType = payload.event || payload.type || 'purchase.created';
    const data = payload.payload || payload.data || payload;

    const email = typeof data.email === 'string' ? data.email.toLowerCase().trim() : null;
    const name = data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
    const sourceId = data.id ? String(data.id) : `kajabi_${Date.now()}`;
    const occurredAt = payload.created_at ? new Date(payload.created_at) : new Date();

    if (eventType.includes('purchase') || data.amount) {
      const amountCents = typeof data.amount === 'number' ? Math.round(data.amount) : 0;
      events.push(new CanonicalEvent({
        entityType:     EntityTypes.PAYMENT,
        organizationId,
        sourceProvider: 'kajabi',
        sourceId:       `kajabi_payment_${sourceId}`,
        fields: {
          amount_cents: amountCents,
          currency:     (data.currency || 'usd').toLowerCase(),
          status:       'succeeded',
          payer_email:  email,
          payer_name:   name,
        },
        rawPayload: payload,
        occurredAt,
      }));
    }

    if (email) {
      events.push(new CanonicalEvent({
        entityType:     EntityTypes.CONTACT,
        organizationId,
        sourceProvider: 'kajabi',
        sourceId:       `kajabi_contact_${email.replace(/[^a-z0-9]/g, '_')}`,
        fields: {
          email,
          full_name: name,
          phone:     data.phone || null,
        },
        rawPayload: payload,
        occurredAt,
      }));
    }

    return events;
  }

  async backfill(credentials, since, organizationId) {
    // Sin organización no se escribe nada. Antes caía a un UUID de pruebas,
    // lo que habría mezclado los datos de un cliente con los de cualquier
    // otro backfill que fallara igual. Mejor romper ruidosamente.
    if (!organizationId) {
      throw new Error('KajabiConnector.backfill() requiere organizationId; recibido: ' + String(organizationId));
    }
    const events = [];
    const apiKey = credentials?.kajabi_api_key || credentials?.delivery_key || credentials?.kajabi;
    if (!apiKey) {
      console.warn('[KajabiConnector] No Kajabi API key configured — skipping backfill');
      return events;
    }

    try {
      // 1. Fetch contacts from Kajabi
      const contactsRes = await fetch('https://api.kajabi.com/v1/contacts', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const contacts = contactsData?.contacts || contactsData?.data || [];

        for (const contact of contacts) {
          const createdAt = contact.created_at ? new Date(contact.created_at) : new Date();
          if (since && createdAt < since) continue;

          events.push(new CanonicalEvent({
            entityType: EntityTypes.CONTACT,
            organizationId: organizationId,
            sourceProvider: 'kajabi',
            sourceId: `kajabi_contact_${contact.id || contact.email}`,
            fields: {
              email: (contact.email || '').toLowerCase(),
              full_name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null,
              phone: contact.phone || null,
            },
            rawPayload: contact,
            occurredAt: createdAt,
          }));
        }
      }

      console.log(`[KajabiConnector] Backfill: ${events.length} events fetched`);
    } catch (err) {
      console.error('[KajabiConnector] Backfill error:', err.message);
    }

    return events;
  }

  async healthCheck(credentials) {
    if (credentials?.kajabi) {
      return { ok: true, message: 'Kajabi webhook secret configured' };
    }
    return { ok: false, message: 'No Kajabi credentials configured' };
  }
}

module.exports = { KajabiConnector };
