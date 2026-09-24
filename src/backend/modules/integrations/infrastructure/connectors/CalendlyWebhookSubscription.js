'use strict';

/**
 * CalendlyWebhookSubscription — creates a webhook subscription in Calendly
 * after a successful Nango OAuth connection.
 *
 * Unlike Stripe and Tally where the coach pastes a webhook secret manually,
 * Calendly webhooks are created programmatically via their API. The signing_key
 * returned in the response must be stored in client_provider_keys.webhook_secret_token.
 *
 * This function is called from nangoRoutes.js when provider_config_key === 'calendly'.
 */

const { getSupabaseClient } = require('../../../../infrastructure/database/supabaseClient');

/**
 * Subscribe to Calendly webhook events for a tenant.
 *
 * @param {string} tenantId — UUID of the tenant
 * @param {string} connectionId — Nango connection ID for Calendly
 * @returns {{ success: boolean, message: string, signingKey?: string }}
 */
async function subscribeCalendlyWebhook(tenantId, connectionId) {
    const nangoSecretKey = process.env.NANGO_SECRET_KEY;
    if (!nangoSecretKey) {
        console.error('[CalendlyWebhookSubscription] NANGO_SECRET_KEY not configured.');
        return { success: false, message: 'NANGO_SECRET_KEY not configured' };
    }

    // 1. Get access token from Nango
    let accessToken;
    try {
        const tokenRes = await fetch(
            `https://api.nango.dev/connection/${connectionId}?provider_config_key=calendly`,
            { headers: { 'Authorization': `Bearer ${nangoSecretKey}` } }
        );

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            throw new Error(`Nango returned HTTP ${tokenRes.status}: ${errBody}`);
        }

        const tokenData = await tokenRes.json();
        accessToken = tokenData?.credentials?.access_token;

        if (!accessToken) {
            throw new Error('No access_token in Nango response');
        }
    } catch (err) {
        console.error(`[CalendlyWebhookSubscription] Failed to fetch Nango token for tenant ${tenantId}:`, err.message);
        return { success: false, message: `Failed to fetch Nango token: ${err.message}` };
    }

    // 2. Get the user's organization URI from Calendly
    let organizationUri;
    let userUri;
    try {
        const meRes = await fetch('https://api.calendly.com/users/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (!meRes.ok) {
            const errBody = await meRes.text();
            throw new Error(`Calendly /users/me returned HTTP ${meRes.status}: ${errBody}`);
        }

        const meData = await meRes.json();
        organizationUri = meData?.resource?.current_organization;
        userUri = meData?.resource?.uri;

        if (!organizationUri) {
            throw new Error('No current_organization in Calendly /users/me response');
        }
    } catch (err) {
        console.error(`[CalendlyWebhookSubscription] Failed to fetch Calendly user info for tenant ${tenantId}:`, err.message);
        return { success: false, message: `Failed to fetch Calendly user info: ${err.message}` };
    }

    // 3. Create webhook subscription
    const baseUrl = process.env.COACHDATA_PUBLIC_URL || 'http://localhost:4000';
    const callbackUrl = `${baseUrl}/api/webhooks/${tenantId}/calendly`;

    let signingKey;
    try {
        const subRes = await fetch('https://api.calendly.com/webhook_subscriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: callbackUrl,
                events: ['invitee.created', 'invitee.canceled'],
                organization: organizationUri,
                user: userUri,
                scope: 'user',
            }),
        });

        if (!subRes.ok) {
            const errBody = await subRes.text();
            throw new Error(`Calendly POST /webhook_subscriptions returned HTTP ${subRes.status}: ${errBody}`);
        }

        const subData = await subRes.json();
        signingKey = subData?.resource?.signing_key;

        if (!signingKey) {
            throw new Error('No signing_key in Calendly webhook subscription response');
        }

        console.log(`[CalendlyWebhookSubscription] Webhook subscribed for tenant ${tenantId}: ${callbackUrl}`);
    } catch (err) {
        console.error(`[CalendlyWebhookSubscription] Failed to create webhook subscription for tenant ${tenantId}:`, err.message);
        return { success: false, message: `Failed to create webhook subscription: ${err.message}` };
    }

    // 4. Save the signing_key in client_provider_keys.webhook_secret_token
    try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Supabase client not initialized');

        // Update the existing calendly row (created by nangoRoutes callback) with the signing key
        const { error: updateErr } = await supabase
            .from('client_provider_keys')
            .update({ webhook_secret_token: signingKey })
            .eq('tenant_id', tenantId)
            .eq('provider_name', 'calendly');

        if (updateErr) {
            throw new Error(`Supabase update failed: ${updateErr.message}`);
        }

        console.log(`[CalendlyWebhookSubscription] Signing key stored in webhook_secret_token for tenant ${tenantId}.`);
        return { success: true, message: 'Webhook subscribed and signing key stored', signingKey };
    } catch (err) {
        console.error(`[CalendlyWebhookSubscription] Failed to store signing key for tenant ${tenantId}:`, err.message);
        // The webhook was created in Calendly but we couldn't store the key.
        // This is a critical failure — the webhook will fire but we can't verify signatures.
        return { success: false, message: `Webhook created but signing key NOT stored: ${err.message}` };
    }
}

module.exports = { subscribeCalendlyWebhook };
