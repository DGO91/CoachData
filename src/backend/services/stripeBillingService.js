/**
 * stripeBillingService.js
 * Production-Hardened Stripe Billing Engine — CoachData Operational OS v2
 */

const Stripe = require('stripe');
const { getStripeApiKey } = require('./stripeInvoiceService');

function getStripeInstance(apiKey = null) {
  const key = apiKey || process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;

  if (!key) {
    // En desarrollo se devolvía `new Stripe('sk_test_mock')`. Esa instancia no
    // es un mock: es un cliente real con una clave inválida, así que fallaba
    // igual pero más tarde y con un error de autenticación de Stripe en vez de
    // uno que señalara la configuración ausente. Falla aquí, y dice qué falta.
    throw new Error('Stripe billing is not configured: falta STRIPE_SECRET_KEY o STRIPE_API_KEY.');
  }

  return new Stripe(key, { apiVersion: '2023-10-16' });
}

class StripeBillingService {
  /**
   * Create Production Checkout Session with no fake success fallbacks in production
   */
  async createCheckoutSession({ organizationId, userEmail, plan = 'pro', successUrl, cancelUrl }) {
    if (!organizationId) throw new Error('organizationId is required for checkout session');

    const apiKey = await getStripeApiKey(organizationId);
    const stripe = getStripeInstance(apiKey);

    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`];
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';

    // El precio se exigía sólo fuera de desarrollo, y si faltaba se enviaba a
    // Stripe un 'price_mock_pro_plan' inexistente. Falta de configuración es
    // falta de configuración en cualquier entorno.
    if (!priceId) {
      throw new Error(`Falta la configuración de precio de Stripe para el plan '${plan}': defina STRIPE_PRICE_${plan.toUpperCase()}.`);
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer_email: userEmail,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl || `${baseUrl}/app/settings/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancel_url: cancelUrl || `${baseUrl}/app/settings/billing?status=cancelled`,
        metadata: {
          organization_id: organizationId,
          plan: plan
        }
      });

      return { sessionId: session.id, url: session.url };
    } catch (err) {
      // En desarrollo, un fallo de Stripe devolvía aquí una sesión inventada con
      // status=success: la interfaz daba el pago por bueno sin que existiera
      // cobro alguno. Un error de pasarela debe verse como lo que es.
      throw new Error(`Stripe Checkout Session creation failed: ${err.message}`);
    }
  }

  /**
   * Create Customer Portal Session
   */
  async createCustomerPortal({ organizationId, stripeCustomerId, returnUrl }) {
    if (!organizationId) throw new Error('organizationId is required');

    const apiKey = await getStripeApiKey(organizationId);
    const stripe = getStripeInstance(apiKey);
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl || `${baseUrl}/app/settings/billing`
      });
      return { url: portalSession.url };
    } catch (err) {
      // Mismo caso que en checkout: el fallback de desarrollo devolvía una URL
      // simulada del portal en vez de propagar el fallo.
      throw new Error(`Stripe Customer Portal creation failed: ${err.message}`);
    }
  }

  /**
   * Process Webhook Events idempotently using stripe_event_id and real SQL persistence
   */
  async processWebhookEvent({ event, supabaseClient = null }) {
    const eventId = event?.id;
    const eventType = event?.type;

    if (!eventId) throw new Error('Invalid Stripe Webhook event: missing event id');

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'stripe_webhook_received',
      eventId,
      eventType
    }));

    if (supabaseClient) {
      // 1. Idempotency check
      //
      // audit-tenant-filter: exento — corre ANTES de resolver la organización;
      // _resolveOrganizationId() es la llamada siguiente. Y filtrar por
      // organización aquí sería un error, no una mejora: stripe_event_id es
      // único global, así que un evento reatribuido a otra organización se
      // procesaría dos veces. La unicidad la garantiza Stripe, no el tenant.
      const { data: existing } = await supabaseClient
        .from('billing_events')
        .select('id, processed')
        .eq('stripe_event_id', eventId)
        .maybeSingle();

      if (existing && existing.processed) {
        console.log(`[StripeBillingService] Event ${eventId} already processed (Idempotent bypass)`);
        return { success: true, idempotent: true };
      }

      const orgId = await this._resolveOrganizationId(event, supabaseClient);

      // 2. Proyectar el evento a las tablas de negocio. Hasta ahora esto no
      // existía: el webhook guardaba el evento en billing_events y devolvía
      // 200, así que billing_customers, billing_subscriptions y
      // billing_invoices se quedaban vacías para siempre. El comentario de
      // webhookRoutes.js afirmaba que este servicio "actualiza
      // billing_subscriptions"; describía la intención, no el código.
      let proyeccion = { proyectado: false, motivo: 'evento sin proyección' };
      try {
        proyeccion = await this._projectEvent(event, orgId, supabaseClient);
      } catch (err) {
        console.error(`[StripeBillingService] Error proyectando ${eventType}: ${err.message}`);
        proyeccion = { proyectado: false, motivo: `error: ${err.message}` };
      }

      // 3. `processed` sólo es cierto cuando no queda nada pendiente. Marcarlo
      // siempre a true dejaba un evento sin atribuir registrado como resuelto,
      // y la comprobación de idempotencia impedía reintentarlo: un cobro
      // legítimo sin metadata se perdía en silencio.
      const pendiente = proyeccion.requeriaProyeccion && !proyeccion.proyectado;
      if (pendiente) {
        console.warn(`[StripeBillingService] ${eventType} (${eventId}) queda SIN procesar: ${proyeccion.motivo}`);
      }

      await supabaseClient.from('billing_events').upsert({
        stripe_event_id: eventId,
        event_type: eventType,
        organization_id: orgId,
        payload: event,
        processed: !pendiente,
        updated_at: new Date().toISOString()
      }, { onConflict: 'stripe_event_id' });

      return { success: true, eventId, eventType, organizationId: orgId, ...proyeccion };
    }

    return { success: true, eventId, eventType };
  }

  /**
   * A qué organización pertenece este evento.
   *
   * Antes se leía sólo `metadata.organization_id` del objeto, lo que obliga a
   * que TODO objeto de Stripe se cree desde la aplicación con esa metadata
   * puesta. Cualquier cliente creado desde el Dashboard o desde la API quedaba
   * huérfano. Ahora hay un segundo camino: la correspondencia
   * stripe_customer_id → organization_id que guarda billing_customers, que es
   * precisamente para lo que existe esa tabla.
   */
  async _resolveOrganizationId(event, supabaseClient) {
    const obj = event?.data?.object || {};

    const porMetadata = obj?.metadata?.organization_id
      || obj?.subscription_details?.metadata?.organization_id
      || null;
    if (porMetadata) return porMetadata;

    if (!supabaseClient) return null;

    // `customer` es el id del cliente en casi todos los eventos de billing; en
    // los eventos del propio cliente, el id está en `obj.id`.
    const stripeCustomerId = typeof obj.customer === 'string'
      ? obj.customer
      : (obj.object === 'customer' ? obj.id : null);
    if (!stripeCustomerId) return null;

    const { data } = await supabaseClient
      .from('billing_customers')
      .select('organization_id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();

    return data?.organization_id || null;
  }

  /**
   * Proyecta el evento a la tabla de negocio que le corresponde.
   *
   * Devuelve `requeriaProyeccion` para que quien llama distinga "no había nada
   * que proyectar" de "había y no se pudo": sólo el segundo caso deja el evento
   * pendiente.
   */
  async _projectEvent(event, orgId, supabaseClient) {
    const tipo = event?.type || '';
    const obj = event?.data?.object || {};
    const ahora = new Date().toISOString();
    const aFecha = (seg) => (seg ? new Date(seg * 1000).toISOString() : null);

    if (tipo.startsWith('customer.subscription.')) {
      if (!orgId) return { requeriaProyeccion: true, proyectado: false, motivo: 'sin organización atribuible' };

      // current_period_start/end viven en el item de la suscripción desde la
      // versión 2025 de la API; en las anteriores estaban en la raíz. Se leen
      // de los dos sitios para no depender de la versión que envíe Stripe.
      const item = obj?.items?.data?.[0] || {};
      await supabaseClient.from('billing_subscriptions').upsert({
        organization_id: orgId,
        stripe_subscription_id: obj.id,
        stripe_price_id: item?.price?.id || null,
        plan: item?.price?.nickname || item?.price?.lookup_key || null,
        status: obj.status || null,
        current_period_start: aFecha(obj.current_period_start ?? item.current_period_start),
        current_period_end: aFecha(obj.current_period_end ?? item.current_period_end),
        cancel_at_period_end: obj.cancel_at_period_end ?? false,
        updated_at: ahora
      }, { onConflict: 'stripe_subscription_id' });

      return { requeriaProyeccion: true, proyectado: true, tabla: 'billing_subscriptions' };
    }

    if (tipo.startsWith('invoice.')) {
      if (!orgId) return { requeriaProyeccion: true, proyectado: false, motivo: 'sin organización atribuible' };

      await supabaseClient.from('billing_invoices').upsert({
        organization_id: orgId,
        stripe_invoice_id: obj.id,
        invoice_number: obj.number || null,
        amount_due: obj.amount_due ?? null,
        currency: obj.currency || null,
        hosted_invoice_url: obj.hosted_invoice_url || null,
        invoice_pdf: obj.invoice_pdf || null,
        status: obj.status || null,
        updated_at: ahora
      }, { onConflict: 'stripe_invoice_id' });

      return { requeriaProyeccion: true, proyectado: true, tabla: 'billing_invoices' };
    }

    if (tipo === 'customer.created' || tipo === 'customer.updated') {
      // Sin organización no se da de alta la correspondencia: una fila con
      // organization_id nulo aquí rompería el propio mecanismo de resolución.
      if (!orgId) return { requeriaProyeccion: true, proyectado: false, motivo: 'sin organización atribuible' };

      await supabaseClient.from('billing_customers').upsert({
        organization_id: orgId,
        stripe_customer_id: obj.id,
        email: obj.email || null,
        updated_at: ahora
      }, { onConflict: 'stripe_customer_id' });

      return { requeriaProyeccion: true, proyectado: true, tabla: 'billing_customers' };
    }

    // charge.*, payment_intent.* y demás no tienen tabla propia: quedan en
    // billing_events, que conserva el payload completo.
    return { requeriaProyeccion: false, proyectado: false, motivo: 'evento sin tabla de destino' };
  }
}

module.exports = new StripeBillingService();
