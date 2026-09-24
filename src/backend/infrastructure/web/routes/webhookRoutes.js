'use strict';

const express = require('express');
const { getSupabaseClient } = require('../../database/supabaseClient');

const { WebhookDispatcher } = require('../../../modules/webhooks/application/WebhookDispatcher');
const { HandlerRegistry } = require('../../../modules/webhooks/registry/HandlerRegistry');
const { SupabaseTenantRepository } = require('../../../modules/webhooks/infrastructure/repositories/SupabaseTenantRepository');
const { SupabaseKeyRepository } = require('../../../modules/webhooks/infrastructure/repositories/SupabaseKeyRepository');
const { TallyWebhookHandler } = require('../../../modules/webhooks/infrastructure/handlers/TallyWebhookHandler');
const { CalendlyWebhookHandler } = require('../../../modules/webhooks/infrastructure/handlers/CalendlyWebhookHandler');
const { AppError } = require('../../../shared/errors/AppError');
const { WebhookInbox } = require('../../../modules/webhooks/application/WebhookInbox');
const { InboxConsumer } = require('../../../modules/webhooks/application/InboxConsumer');

// Canonical integration layer
const { ConnectorRegistry } = require('../../../modules/integrations/application/ConnectorRegistry');
const { IngestionDispatcher } = require('../../../modules/integrations/application/IngestionDispatcher');
const { SupabaseCanonicalRepository } = require('../../../modules/integrations/infrastructure/repositories/SupabaseCanonicalRepository');
const { TallyConnector } = require('../../../modules/integrations/infrastructure/connectors/TallyConnector');
const { CalendlyConnector } = require('../../../modules/integrations/infrastructure/connectors/CalendlyConnector');
const { KajabiConnector } = require('../../../modules/integrations/infrastructure/connectors/KajabiConnector');
const { WhatsAppCloudConnector } = require('../../../modules/integrations/infrastructure/connectors/WhatsAppCloudConnector');

const router = express.Router();

// Each provider signs requests differently and names its header differently —
// the router's job is just to hand the right raw material to the handler,
// which owns the actual verification logic for its own provider.
const SIGNATURE_HEADERS = {
    stripe: 'stripe-signature',
    tally: 'tally-signature',
    calendly: 'calendly-webhook-signature',
    kajabi: 'x-kajabi-signature',
    whatsapp_cloud: 'x-hub-signature-256',
    whatsapp: 'x-hub-signature-256',
};

// Proveedores que este dispatcher sabe procesar. Se comprueba antes de guardar
// el evento: aceptar lo que nadie puede normalizar significaría reintentarlo
// cinco veces, descartarlo, y disparar una alerta de "eventos sin registrar" por
// algo que en realidad llegó a la puerta equivocada.
//
// Stripe no está aquí a propósito: sus webhooks los atiende en exclusiva
// /api/billing/webhooks/stripe.
const PROVEEDORES_ACEPTADOS = new Set(['tally', 'calendly', 'kajabi', 'whatsapp_cloud', 'whatsapp']);

// Meta WhatsApp Cloud API Webhook verification challenge
router.get('/whatsapp_cloud', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && (token === process.env.META_WA_VERIFY_TOKEN || token === 'coachdata_wa_token')) {
            console.log('[Webhook Router] Meta WhatsApp Cloud webhook verified!');
            return res.status(200).send(challenge);
        }
        return res.sendStatus(403);
    }
    return res.sendStatus(400);
});

// Wiring is built lazily on first request, not at module load, so a missing
// Supabase client at boot doesn't crash the process — it fails the request
// with a clear 500 instead, same behavior as the rest of this file's routes.
let dispatcher = null;

function getDispatcher() {
    if (dispatcher) return dispatcher;

    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Stripe NO se registra aquí. Sus webhooks los atiende en exclusiva
    // routes/stripeWebhookRoutes.js, que proyecta a billing_customers,
    // billing_subscriptions y billing_invoices a través de
    // stripeBillingService (decisión de 2026-08-16; la proyección se
    // implementó el 2026-08-19 — hasta entonces esta frase describía una
    // intención, no el código). Registrarlo
    // también en este dispatcher haría que cada evento se procesara dos veces,
    // por dos caminos con modelos de datos distintos.
    //
    // StripeConnector sigue vivo y en uso para el backfill y el estado de
    // conexión —nangoRoutes y connectionStatusRoutes lo registran por su
    // cuenta—; lo que se retira es únicamente la ingesta de webhooks.
    const handlerRegistry = new HandlerRegistry()
        .register('tally', new TallyWebhookHandler())
        .register('calendly', new CalendlyWebhookHandler());

    // Canonical layer — wired alongside existing webhook handlers
    const connectorRegistry = new ConnectorRegistry()
        .register(new TallyConnector())
        .register(new CalendlyConnector())
        .register(new KajabiConnector())
        .register(new WhatsAppCloudConnector());

    const canonicalRepository = new SupabaseCanonicalRepository(supabase);
    const ingestionDispatcher = new IngestionDispatcher({ canonicalRepository });

    dispatcher = new WebhookDispatcher({
        tenantRepository:    new SupabaseTenantRepository(supabase),
        keyRepository:       new SupabaseKeyRepository(supabase),
        handlerRegistry,
        ingestionDispatcher,
        connectorRegistry,
    });
    return dispatcher;
}

router.post('/:tenant_id/:provider', async (req, res) => {
    const { tenant_id, provider } = req.params;

    console.log(`[Webhook Router] Evento recibido para el tenant ${tenant_id} desde ${provider}`);

    if (!PROVEEDORES_ACEPTADOS.has(String(provider).toLowerCase())) {
        console.warn(`[Webhook Router] Proveedor no atendido en esta ruta: ${provider}`);
        return res.status(404).json({
            error: 'Not Found',
            message: `Esta ruta no atiende webhooks de '${provider}'.`,
        });
    }

    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Base de datos no configurada' });

    // El webhook sólo recibe. Guardar el evento y responder rápido es lo que
    // impide perderlo: antes se normalizaba aquí mismo, con la petición del
    // proveedor abierta, y un fallo de la base de datos devolvía un error que
    // sólo se recuperaba si el proveedor reintentaba — y no todos reintentan.
    // La normalización la hace el consumidor, que sí puede reintentar.
    try {
        const inbox = new WebhookInbox({ supabaseClient: supabase });
        const { id, duplicado } = await inbox.recibir({
            tenantRef: tenant_id,
            provider,
            payload: req.body,
            rawBody: req.rawBody,
            signature: req.headers[SIGNATURE_HEADERS[provider.toLowerCase()]],
        });

        // Un reenvío que ya teníamos también se responde con 200: es la señal
        // que hace que el proveedor deje de insistir.
        return res.status(200).json({ received: true, duplicated: duplicado, id });
    } catch (err) {
        if (err instanceof AppError) {
            console.error(`[Webhook Router] ${err.errorCode}:`, err.message);
            return res.status(err.statusCode).json({ error: err.message });
        }
        console.error('[Webhook Router] Error guardando el evento:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
module.exports.getDispatcher = getDispatcher;
