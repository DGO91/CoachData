const express = require('express');
const router = express.Router();
const { upsertTenantKey } = require('../../../application/credentials/credentialsUseCase');

// Generate a Nango connect session token for the frontend UI
router.post('/session-token', async (req, res) => {
    try {
        // La organización se toma del contexto del token, no del cuerpo: si se
        // aceptara el `tenantId` que manda el navegador, cualquier usuario
        // autenticado podría pedir una sesión de conexión para otra
        // organización y colgarle una integración.
        const tenantId = req.tenant?.id || req.body?.tenantId;
        if (!tenantId) {
            return res.status(400).json({ success: false, error: 'tenantId is required' });
        }

        const NANGO_SECRET_KEY = process.env.NANGO_SECRET_KEY;
        if (!NANGO_SECRET_KEY) {
            return res.status(500).json({ success: false, error: 'NANGO_SECRET_KEY is not configured in environment' });
        }

        // Fetch a session token using Nango's REST API
        // Docs: https://docs.nango.dev/integrate/guides/connect-ui#2-generate-a-connect-session-token
        const response = await fetch('https://api.nango.dev/connect/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NANGO_SECRET_KEY}`,
                'Content-Type': 'application/json'
            },
            // Nango espera `end_user` como objeto. Con `end_user_id` responde
            // 400 invalid_body ("Unrecognized key"), que es lo que devolvia
            // esta ruta desde que se escribio: nadie la habia llamado todavia.
            // `allowed_integrations` acota la ventana a la herramienta que el
            // coach acaba de pulsar. Sin esto, Nango le pide que vuelva a
            // elegirla de una lista que ya habia elegido.
            body: JSON.stringify({
                end_user: { id: tenantId },
                ...(req.body?.integrationId
                    ? { allowed_integrations: [req.body.integrationId] }
                    : {}),
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // Sin stringify esto imprimia "[object Object]" y escondia
            // exactamente el campo que Nango estaba rechazando.
            console.error('[Nango API Error]', JSON.stringify(data));
            const detalle = data?.error?.errors?.map((e) => `${e.path?.join('.') || ''}: ${e.message}`).join('; ');
            throw new Error(detalle || data?.error?.code || data.message || 'Failed to create Nango session token');
        }

        // La respuesta viene envuelta: { data: { token, connect_link } }.
        // Leer `data.token` a secas devolvia undefined aun con un 200.
        const token = data?.data?.token || data?.token;
        if (!token) throw new Error('Nango no devolvio token de sesion');

        res.json({ success: true, token });
    } catch (error) {
        console.error('[Nango] Error generating session token:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle Nango callbacks after successful authorization
router.post('/callback', async (req, res) => {
    try {
        const { connection_id, provider_config_key, tenant_id } = req.body;
        console.log(`[Nango] Callback received for tenant: ${tenant_id}, Provider: ${provider_config_key}, Connection: ${connection_id}`);
        
        if (connection_id && provider_config_key && tenant_id) {
            // Derive category from the provider instead of hardcoding 'crm'
            const NANGO_PROVIDER_CATEGORIES = {
                hubspot: 'crm', pipedrive: 'crm', salesforce: 'crm', notion: 'crm',
                'highlevel-white-label': 'crm', gohighlevel: 'crm',
                mailchimp: 'crm', activecampaign: 'crm',
                calendly: 'scheduling', 'google-calendar': 'scheduling',
                stripe: 'payment',
            };
            const category = NANGO_PROVIDER_CATEGORIES[provider_config_key] || 'integration';

            // Encrypt and save the connection_id in Supabase
            await upsertTenantKey(tenant_id, category, provider_config_key, connection_id);
            console.log(`[Nango] Encrypted and saved connection ID for ${provider_config_key} (category: ${category}) to Supabase`);

            // For Calendly: automatically subscribe the webhook after successful OAuth
            if (provider_config_key === 'calendly') {
                const { subscribeCalendlyWebhook } = require('../../../modules/integrations/infrastructure/connectors/CalendlyWebhookSubscription');
                const subResult = await subscribeCalendlyWebhook(tenant_id, connection_id);
                if (subResult.success) {
                    console.log(`[Nango] Calendly webhook subscription created for tenant ${tenant_id}.`);
                } else {
                    // Log loudly — the coach thinks Calendly is connected but no events will arrive
                    console.error(`[Nango] CRITICAL: Calendly connected but webhook subscription FAILED for tenant ${tenant_id}: ${subResult.message}`);
                }
            }

            // Automatically trigger Backfill in background to pull historical data
            (async () => {
                try {
                    const { ConnectorRegistry } = require('../../../modules/integrations/application/ConnectorRegistry');
                    const { IngestionDispatcher } = require('../../../modules/integrations/application/IngestionDispatcher');
                    const { BackfillOrchestrator } = require('../../../modules/integrations/application/BackfillOrchestrator');
                    const { SupabaseCanonicalRepository } = require('../../../modules/integrations/infrastructure/repositories/SupabaseCanonicalRepository');
                    // Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
                    const { CalendlyConnector } = require('../../../modules/integrations/infrastructure/connectors/CalendlyConnector');
                    const { StripeConnector } = require('../../../modules/integrations/infrastructure/connectors/StripeConnector');
                    const { TallyConnector } = require('../../../modules/integrations/infrastructure/connectors/TallyConnector');
                    const { KajabiConnector } = require('../../../modules/integrations/infrastructure/connectors/KajabiConnector');

                    const supabase = dbDeUsuario(req, res);
                    if (!supabase) return;

                    const registry = new ConnectorRegistry()
                        .register(new CalendlyConnector())
                        .register(new StripeConnector())
                        .register(new TallyConnector())
                        .register(new KajabiConnector());

                    const repo = new SupabaseCanonicalRepository(supabase);
                    const ingestion = new IngestionDispatcher({ canonicalRepository: repo });
                    const orchestrator = new BackfillOrchestrator({ connectorRegistry: registry, ingestionDispatcher: ingestion });

                    const credentials = { [provider_config_key]: connection_id };
                    await orchestrator.runBackfill(provider_config_key, tenant_id, credentials);
                } catch (bErr) {
                    console.error(`[Nango] Async backfill failed for ${provider_config_key}:`, bErr.message);
                }
            })().catch(err => console.error('[Nango] Backfill execution error:', err));
        }
        
        res.json({ success: true, message: 'Nango connection registered successfully' });
    } catch (error) {
        console.error('[Nango] Error in callback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
