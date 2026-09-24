const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');
const { encrypt, decrypt } = require('../../infrastructure/services/encryptionService');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/tasks'
];

function getGoogleOAuthClient(req) {
    try {
        const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            console.error('[Google OAuth] Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in .env');
            return null;
        }

        let redirectUri = process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI;
        if (!redirectUri) {
            if (req && req.headers && req.headers.host) {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
                redirectUri = `${protocol}://${req.headers.host}/api/auth/google/callback`;
            } else {
                redirectUri = 'http://localhost:4000/api/auth/google/callback';
            }
        }

        return new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );
    } catch (e) {
        console.error('[Google OAuth] Error configuring OAuth2 client:', e);
        return null;
    }
}

async function handleGoogleCallback(code, state, req) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const jwt = require('jsonwebtoken');
    const { INTERNAL_SECRET } = require('../../config/env');
    const decodedState = jwt.verify(state, INTERNAL_SECRET);
    const tenantId = decodedState.tenantId;

    const oauth2Client = getGoogleOAuthClient(req);
    if (!oauth2Client) throw new Error('Google OAuth Client not configured');
    
    const { tokens } = await oauth2Client.getToken(code);

    // Resolve all linked IDs for this tenant/user (multi-tenant organization + legacy tenant)
    const targetIds = [tenantId];

    // Find linked user_ids or organization_ids
    const { data: memberRows } = await supabase
        .from('organization_memberships')
        .select('organization_id, user_id')
        .or(`organization_id.eq.${tenantId},user_id.eq.${tenantId}`);

    if (memberRows && memberRows.length > 0) {
        memberRows.forEach(m => {
            if (m.organization_id && !targetIds.includes(m.organization_id)) targetIds.push(m.organization_id);
            if (m.user_id && !targetIds.includes(m.user_id)) targetIds.push(m.user_id);
        });
    }

    const { data: tenantRows } = await supabase
        .from('tenants')
        .select('id, auth_user_id')
        .or(targetIds.map(id => `id.eq.${id},auth_user_id.eq.${id}`).join(','));

    if (tenantRows && tenantRows.length > 0) {
        tenantRows.forEach(tr => {
            if (tr.id && !targetIds.includes(tr.id)) targetIds.push(tr.id);
            if (tr.auth_user_id && !targetIds.includes(tr.auth_user_id)) targetIds.push(tr.auth_user_id);
        });
    }

    // Preserve existing refresh_token if Google did not return a new one on this consent
    let existingRefreshToken = null;
    const { data: existingRecords } = await supabase
        .from('client_provider_keys')
        .select('api_key_encrypted')
        .in('tenant_id', targetIds)
        .in('provider_name', ['google_calendar_oauth', 'google_mail_oauth']);

    if (existingRecords && existingRecords.length > 0) {
        for (const rec of existingRecords) {
            try {
                const parsed = JSON.parse(decrypt(rec.api_key_encrypted));
                if (parsed.refresh_token) {
                    existingRefreshToken = parsed.refresh_token;
                    break;
                }
            } catch (e) {}
        }
    }

    const tokenData = {
        token: tokens.access_token,
        refresh_token: tokens.refresh_token || existingRefreshToken,
        token_uri: "https://oauth2.googleapis.com/token",
        client_id: oauth2Client._clientId,
        client_secret: oauth2Client._clientSecret,
        scopes: SCOPES,
        expiry: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString()
    };

    const encryptedToken = encrypt(JSON.stringify(tokenData));

    // Upsert tokens for both calendar and mail across all linked tenant IDs
    const providers = ['google_calendar_oauth', 'google_mail_oauth'];

    for (const target of targetIds) {
        for (const prov of providers) {
            const { data: existing } = await supabase
                .from('client_provider_keys')
                .select('id')
                .eq('tenant_id', target)
                .eq('provider_name', prov)
                .maybeSingle();

            if (existing) {
                await supabase.from('client_provider_keys')
                    .update({ api_key_encrypted: encryptedToken, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
            } else {
                await supabase.from('client_provider_keys')
                    .insert([{
                        tenant_id: target,
                        provider_type: 'identity',
                        provider_name: prov,
                        api_key_encrypted: encryptedToken
                    }]);
            }
        }
    }

    return tenantId;
}

module.exports = {
    getGoogleOAuthClient,
    handleGoogleCallback,
    SCOPES
};
