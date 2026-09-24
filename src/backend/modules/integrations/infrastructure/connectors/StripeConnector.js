'use strict';

const Stripe = require('stripe');
const { IConnector }    = require('../../application/ports/IConnector');
const { CanonicalEvent } = require('../../domain/CanonicalEvent');
const { EntityTypes }    = require('../../domain/EntityTypes');
const { AppError }       = require('../../../../shared/errors/AppError');

/**
 * StripeConnector — maps Stripe webhook events to canonical entities.
 *
 * verifySignature delegates to Stripe's constructEvent.
 * parseWebhook maps events to CanonicalEvent[] (payment + contact).
 */
class StripeConnector extends IConnector {
  get id() { return 'stripe'; }
  get category() { return 'payments'; }
  get auth() { return 'apikey'; }
  get capabilities() { return ['payments', 'contacts']; }

  /**
   * Verify Stripe webhook signature using constructEvent.
   * Fails closed: missing secret or bad signature throws.
   */
  verifySignature(rawBody, headers, secret) {
    if (!secret) {
      throw new AppError('No Stripe webhook secret configured', 500, 'WEBHOOK_NOT_CONFIGURED');
    }
    const signature = headers['stripe-signature'];
    if (!signature || !rawBody) {
      throw new AppError('Missing Stripe signature', 400, 'MISSING_SIGNATURE');
    }
    try {
      new Stripe(secret).webhooks.constructEvent(rawBody, signature, secret);
      return true;
    } catch (err) {
      throw new AppError(`Invalid Stripe signature: ${err.message}`, 400, 'INVALID_SIGNATURE');
    }
  }

  /**
   * Parse a verified Stripe webhook payload into canonical events.
   * Handles: checkout.session.completed, invoice.paid, charge.succeeded,
   * payment_intent.succeeded, customer.created/updated.
   *
   * @param {object} payload — parsed Stripe webhook body
   * @param {string} organizationId
   * @returns {CanonicalEvent[]}
   */
  parseWebhook(payload, organizationId) {
    const events = [];
    const type = payload?.type;
    const obj  = payload?.data?.object;

    if (!type || !obj) return events;

    switch (type) {
      case 'checkout.session.completed': {
        // Payment event
        events.push(new CanonicalEvent({
          entityType:     EntityTypes.PAYMENT,
          organizationId,
          sourceProvider: 'stripe',
          sourceId:       obj.id || `cs_${Date.now()}`,
          fields: {
            amount_cents: obj.amount_total || 0,
            currency:     (obj.currency || 'usd').toLowerCase(),
            status:       obj.payment_status || 'succeeded',
            payer_email:  obj.customer_details?.email || obj.customer_email || null,
            payer_name:   obj.customer_details?.name || null,
          },
          rawPayload: payload,
          occurredAt: obj.created ? new Date(obj.created * 1000) : new Date(),
        }));

        // Contact event from the payer
        const email = obj.customer_details?.email || obj.customer_email;
        if (email) {
          events.push(new CanonicalEvent({
            entityType:     EntityTypes.CONTACT,
            organizationId,
            sourceProvider: 'stripe',
            sourceId:       `cus_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            fields: {
              email:     email.toLowerCase(),
              full_name: obj.customer_details?.name || null,
              phone:     obj.customer_details?.phone || null,
            },
            rawPayload: { source_event: type, customer_details: obj.customer_details || {} },
            occurredAt: obj.created ? new Date(obj.created * 1000) : new Date(),
          }));
        }
        break;
      }

      case 'invoice.paid': {
        events.push(new CanonicalEvent({
          entityType:     EntityTypes.PAYMENT,
          organizationId,
          sourceProvider: 'stripe',
          sourceId:       obj.id || `inv_${Date.now()}`,
          fields: {
            amount_cents: obj.amount_paid || 0,
            currency:     (obj.currency || 'usd').toLowerCase(),
            status:       'succeeded',
            payer_email:  obj.customer_email || null,
            payer_name:   obj.customer_name || null,
          },
          rawPayload: payload,
          occurredAt: obj.created ? new Date(obj.created * 1000) : new Date(),
        }));
        break;
      }

      case 'charge.succeeded':
      case 'payment_intent.succeeded': {
        events.push(new CanonicalEvent({
          entityType:     EntityTypes.PAYMENT,
          organizationId,
          sourceProvider: 'stripe',
          sourceId:       obj.id || `pi_${Date.now()}`,
          fields: {
            amount_cents: obj.amount || obj.amount_received || 0,
            currency:     (obj.currency || 'usd').toLowerCase(),
            status:       'succeeded',
            payer_email:  obj.receipt_email || obj.billing_details?.email || null,
            payer_name:   obj.billing_details?.name || null,
          },
          rawPayload: payload,
          occurredAt: obj.created ? new Date(obj.created * 1000) : new Date(),
        }));
        break;
      }

      case 'customer.created':
      case 'customer.updated': {
        events.push(new CanonicalEvent({
          entityType:     EntityTypes.CONTACT,
          organizationId,
          sourceProvider: 'stripe',
          sourceId:       obj.id || `cus_${Date.now()}`,
          fields: {
            email:     obj.email?.toLowerCase() || null,
            full_name: obj.name || null,
            phone:     obj.phone || null,
          },
          rawPayload: payload,
          occurredAt: obj.created ? new Date(obj.created * 1000) : new Date(),
        }));
        break;
      }

      default:
        // Unknown event type — log but don't fail. Not every Stripe event
        // maps to a canonical entity.
        console.log(`[StripeConnector] Skipping unmapped event type: ${type}`);
    }

    return events;
  }

  async backfill(credentials, since, organizationId) {
    // Sin organización no se escribe nada. Antes caía a un UUID de pruebas,
    // lo que habría mezclado los datos de un cliente con los de cualquier
    // otro backfill que fallara igual. Mejor romper ruidosamente.
    if (!organizationId) {
      throw new Error('StripeConnector.backfill() requiere organizationId; recibido: ' + String(organizationId));
    }
    const events = [];
    const apiKey = credentials?.stripe;
    if (!apiKey) {
      console.warn('[StripeConnector] No Stripe API key — skipping backfill');
      return events;
    }

    const stripe = new Stripe(apiKey);
    const sinceTimestamp = Math.floor((since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).getTime() / 1000);

    // 1. Pull payment intents (succeeded) with auto-pagination
    try {
      const params = { limit: 100, created: { gte: sinceTimestamp } };
      for await (const pi of stripe.paymentIntents.list(params)) {
        if (pi.status !== 'succeeded') continue;

        events.push(new CanonicalEvent({
          entityType:     EntityTypes.PAYMENT,
          organizationId: organizationId,
          sourceProvider: 'stripe',
          sourceId:       pi.id,
          fields: {
            amount_cents: pi.amount,
            currency:     pi.currency,
            status:       pi.status,
            customer_id:  pi.customer,
            description:  pi.description,
          },
          rawPayload: { id: pi.id, amount: pi.amount, currency: pi.currency, status: pi.status },
          occurredAt: new Date(pi.created * 1000),
        }));
      }
      console.log(`[StripeConnector] Backfill: ${events.length} payment intents fetched`);
    } catch (err) {
      console.error('[StripeConnector] Backfill payments error:', err.message);
    }

    // 2. Pull customers
    try {
      const custParams = { limit: 100, created: { gte: sinceTimestamp } };
      for await (const cust of stripe.customers.list(custParams)) {
        events.push(new CanonicalEvent({
          entityType:     EntityTypes.CONTACT,
          organizationId: organizationId,
          sourceProvider: 'stripe',
          sourceId:       `stripe_customer_${cust.id}`,
          fields: {
            email:     cust.email,
            full_name: cust.name,
            phone:     cust.phone,
          },
          rawPayload: { id: cust.id, email: cust.email, name: cust.name },
          occurredAt: new Date(cust.created * 1000),
        }));
      }
    } catch (err) {
      console.error('[StripeConnector] Backfill customers error:', err.message);
    }

    return events;
  }

  async healthCheck(credentials) {
    try {
      if (!credentials?.stripe) {
        return { ok: false, message: 'No Stripe API key configured' };
      }
      // A lightweight call to verify the key is valid
      const stripe = new Stripe(credentials.stripe);
      await stripe.balance.retrieve();
      return { ok: true, message: 'Stripe connection healthy' };
    } catch (err) {
      return { ok: false, message: `Stripe health check failed: ${err.message}` };
    }
  }
}

module.exports = { StripeConnector };
