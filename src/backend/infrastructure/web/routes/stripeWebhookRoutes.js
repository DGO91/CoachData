/**
 * stripeWebhookRoutes.js
 * Webhook entrante de Stripe — camino único de facturación.
 *
 * Vive en su propio router, y no dentro de billingRoutes, por dos razones que
 * lo mantenían roto:
 *
 * 1. AUTENTICACIÓN. billingRoutes se monta detrás de authMiddleware y
 *    tenantContextMiddleware. Stripe no envía Authorization ni
 *    x-organization-slug, así que sus eventos morían en 401 sin llegar nunca al
 *    handler. Un webhook se autentica por firma criptográfica, no por sesión.
 *
 * 2. CUERPO CRUDO. app.js aplica express.json() a toda la aplicación antes de
 *    registrar las rutas. Un express.raw() declarado más abajo llega tarde: el
 *    cuerpo ya se consumió y constructEvent recibiría el objeto ya parseado en
 *    lugar de los bytes exactos que Stripe firmó, de modo que la verificación
 *    fallaría incluso con el secreto correcto. Por eso app.js monta este router
 *    ANTES del parser JSON global.
 *
 * La organización no se deduce de la petición: viaja en
 * event.data.object.metadata.organization_id, que stripeBillingService escribe
 * al crear la sesión de checkout.
 */
'use strict';

const express = require('express');
const Stripe = require('stripe');
const stripeBillingService = require('../../../services/stripeBillingService');
const { getSupabaseClient } = require('../../database/supabaseClient');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;

  // Sin secreto no hay forma de distinguir un evento de Stripe de uno inventado.
  // Antes se saltaba esta comprobación cuando NODE_ENV era 'development', que es
  // precisamente el valor del .env del repositorio: cualquiera que alcanzara la
  // ruta podía dar por pagada una suscripción. La verificación ya no depende del
  // entorno.
  if (!webhookSecret || !apiKey) {
    console.error('[StripeWebhook] Falta STRIPE_WEBHOOK_SECRET o la clave de API: no se pueden verificar los eventos.');
    return res.status(503).send('Webhook not configured');
  }

  if (!signature) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    console.error('[StripeWebhook] Firma inválida:', err.message);
    return res.status(400).send(`Webhook Signature Verification Error: ${err.message}`);
  }

  try {
    const result = await stripeBillingService.processWebhookEvent({
      event,
      // El cliente se pasa explícitamente: sin él, processWebhookEvent se salta
      // en silencio tanto el control de idempotencia como el registro en
      // billing_events, y reprocesaría cada reintento de Stripe.
      supabaseClient: getSupabaseClient()
    });
    res.json({ received: true, ...result });
  } catch (err) {
    console.error('[StripeWebhook] Error procesando el evento:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
