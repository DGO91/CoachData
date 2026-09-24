/**
 * internalAgentRoutes.js
 * Dedicated router for internal background agent processes (Morning Briefing, Evening Summary, etc.)
 * Protected by verifyInternalToken middleware (x-internal-token header).
 * CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const { verifyInternalToken } = require('../middlewares/authMiddleware');
const { getDecryptedTenantKeys } = require('../../../application/credentials/credentialsUseCase');

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/internal/credentials/:tenantId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/credentials/:tenantId', verifyInternalToken, async (req, res) => {
    try {
        const result = await getDecryptedTenantKeys(req.params.tenantId);
        res.json(result);
    } catch (err) {
        console.error('[Internal Agent API] Error fetching credentials:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/internal/evolution/send
// ─────────────────────────────────────────────────────────────────────────────
router.post('/evolution/send', verifyInternalToken, async (req, res) => {
    try {
        const { tenant_id, tenantId: bodyTenantId, message, number } = req.body || {};
        const tenantId = tenant_id || bodyTenantId;

        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_id is required for internal delivery' });
        }
        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        let targetNumber = number;
        if (!targetNumber) {
            try {
                const creds = await getDecryptedTenantKeys(tenantId);
                targetNumber = creds.keys && creds.keys.whatsapp_number;
            } catch (err) {
                console.error(`[Internal Evolution API] Error looking up tenant whatsapp_number for ${tenantId}:`, err.message);
            }
        }

        if (targetNumber) {
            targetNumber = targetNumber.toString().replace(/\D/g, '');
        }

        // STRICT MULTI-TENANT ISOLATION: Fail with 400 if no number is configured for this specific tenant.
        // NEVER fall back to a single global .env phone number across different coaches!
        if (!targetNumber) {
            console.warn(`[Internal Evolution API] REJECTED: Tenant ${tenantId} has no WhatsApp number configured.`);
            return res.status(400).json({
                error: 'No target WhatsApp number configured for this tenant',
                tenantId
            });
        }

        const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
        const axios = require('axios');
        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(500).json({ error: 'Evolution API environment variables not configured' });
        }

        const url = `${baseUrl}/message/sendText/${instanceName}`;
        const response = await axios.post(url, {
            number: targetNumber,
            options: { delay: 1200, presence: 'composing' },
            text: message
        }, {
            headers: { 'apikey': apiKey, 'Content-Type': 'application/json' }
        });

        res.json({
            success: true,
            message: 'Sent via Evolution API Internal Endpoint',
            tenantId,
            targetNumber,
            providerResponse: response.data
        });
    } catch (error) {
        console.error('[Internal Evolution API] Send Error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to send internal WhatsApp message' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/internal/credentials/:tenantId/update
// ─────────────────────────────────────────────────────────────────────────────
// Esta ruta existe SOLO para que el auto-refresh de OAuth devuelva a la bóveda
// el token que Google acaba de renovar. Nada más.
//
// La lista blanca no es decorativa: `upsertTenantKey` localiza la fila por
// (tenant_id, provider_name), así que sin ella un `provider_name` cualquiera
// sobrescribe cualquier credencial de ese coach — incluido `whatsapp_number`,
// que decide a qué teléfono van sus reportes. Verificado: antes de este filtro,
// un provider_name inventado creaba su fila y devolvía 200.
const REFRESHABLE_PROVIDERS = ['google_calendar_oauth', 'google_mail_oauth'];

router.post('/credentials/:tenantId/update', verifyInternalToken, async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { provider_name, token_data } = req.body || {};

        if (!provider_name || !token_data) {
            return res.status(400).json({ error: 'provider_name and token_data are required' });
        }

        if (!REFRESHABLE_PROVIDERS.includes(provider_name)) {
            console.warn(`[Internal Agent API] REJECTED credential update for tenant ${tenantId}: provider_name '${provider_name}' is not refreshable.`);
            return res.status(400).json({
                error: 'provider_name is not allowed for token refresh',
                allowed: REFRESHABLE_PROVIDERS
            });
        }

        const { upsertTenantKey, getDecryptedTenantKeys } = require('../../../application/credentials/credentialsUseCase');
        await upsertTenantKey(tenantId, 'identity', provider_name, JSON.stringify(token_data));

        // If Google OAuth has been revoked, notify the coach via WhatsApp in addition to flagging the vault status
        if (token_data.status === 'needs_reconnection') {
            console.warn(`[Internal Agent API] google oauth token revoked for tenant ${tenantId} (${provider_name}). Triggering WhatsApp notification...`);
            
            let targetNumber = null;
            try {
                const creds = await getDecryptedTenantKeys(tenantId);
                targetNumber = creds.keys && creds.keys.whatsapp_number;
            } catch (err) {
                console.error(`[Internal Agent API] Failed to lookup target number for revocation alert:`, err.message);
            }

            if (targetNumber) {
                const cleanNumber = targetNumber.toString().replace(/\D/g, '');
                const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
                const axios = require('axios');
                const baseUrl = process.env.EVOLUTION_API_URL;
                const apiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

                if (baseUrl && apiKey) {
                    const cleanName = provider_name === 'google_calendar_oauth' ? 'Google Calendar' : 'Google Mail';
                    const messageText = `⚠️ *Aviso de CoachData OS*\n\nTu cuenta de *${cleanName}* se ha desconectado por motivos de seguridad o expiración del token.\n\nPor favor, vuelve a iniciar sesión para que tus agentes de IA puedan seguir entregándote tus informes:\n👉 http://localhost:4000/credentials`;
                    
                    try {
                        await axios.post(`${baseUrl}/message/sendText/${instanceName}`, {
                            number: cleanNumber,
                            options: { delay: 1000, presence: 'composing' },
                            text: messageText
                        }, {
                            headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
                            timeout: 10000
                        });
                        console.log(`[Internal Agent API] Reconnection alert sent via WhatsApp to ${cleanNumber}`);
                    } catch (wsErr) {
                        console.error(`[Internal Agent API] Failed to deliver WhatsApp reconnection alert:`, wsErr.message);
                    }
                }
            }
        }

        res.json({
            success: true,
            message: `Successfully updated credential for provider: ${provider_name}`
        });
    } catch (err) {
        console.error('[Internal Agent API] Error updating credential:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
