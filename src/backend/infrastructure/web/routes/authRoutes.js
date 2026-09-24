const express = require('express');
const jwt = require('jsonwebtoken');
const { getGoogleOAuthClient, handleGoogleCallback, SCOPES } = require('../../../application/auth/googleAuthUseCase');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { INTERNAL_SECRET } = require('../../../config/env');

const router = express.Router();

router.post('/google/prepare', authMiddleware, async (req, res) => {
    const { tenantId, type } = req.body || {};
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });

    const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');
    const supabase = getSupabaseClient();
    if (!supabase) {
        return res.status(500).json({ error: 'Internal Server Error', message: 'Supabase no inicializado' });
    }

    try {
        const targetTenantId = tenantId || userId;

        // Verify tenant ownership / membership across both tenant conventions
        let isAuthorized = false;

        // 1. Direct match with auth user id
        if (targetTenantId === userId) {
            isAuthorized = true;
        }

        // 2. Match in legacy tenants table (id or auth_user_id)
        if (!isAuthorized) {
            const { data: tenantRow } = await supabase
                .from('tenants')
                .select('id')
                .eq('id', targetTenantId)
                .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
                .maybeSingle();

            if (tenantRow) isAuthorized = true;
        }

        // 3. Match in canonical organization memberships
        if (!isAuthorized) {
            const { data: memberRow } = await supabase
                .from('organization_memberships')
                .select('organization_id')
                .eq('organization_id', targetTenantId)
                .eq('user_id', userId)
                .maybeSingle();

            if (memberRow) isAuthorized = true;
        }

        // 4. Si el usuario aún no tiene fila en el modelo heredado `tenants`, se
        // le crea aquí. Crearla NO autoriza nada: este bloque marcaba
        // `isAuthorized = true` sin volver a mirar el tenant solicitado, así que
        // cualquier usuario autenticado sin fila propia obtenía un state firmado
        // para el tenant de otro —y ese tenantId acaba escribiendo en
        // `client_provider_keys`, el vault de credenciales—. Un usuario legítimo
        // sin fila sigue pasando por la comprobación 1 (el tenant es él mismo) o
        // por la 3 (es miembro de la organización).
        const { data: ownTenant } = await supabase
            .from('tenants')
            .select('id')
            .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
            .maybeSingle();

        if (!ownTenant) {
            await supabase
                .from('tenants')
                .insert([{
                    id: userId,
                    auth_user_id: userId,
                    company_name: req.user.user_metadata?.full_name || req.user.email || 'Tenant',
                    primary_contact_email: req.user.email || '',
                    active_package: 'Free Tier',
                }])
                .maybeSingle();
        }

        if (!isAuthorized) {
            console.warn(`[Google OAuth Security] Ownership check failed for user ${userId} on tenant ${targetTenantId}`);
            return res.status(403).json({ error: 'Forbidden', message: 'Tenant ownership verification failed' });
        }

        const authType = type || 'mail';
        const finalTenantId = ownTenant?.id || targetTenantId;
        // Sign the OAuth state with a short-lived JWT (15 minutes)
        const stateData = jwt.sign({ tenantId: finalTenantId, type: authType }, INTERNAL_SECRET, { expiresIn: '15m' });
        
        return res.json({ state: stateData });
    } catch (err) {
        console.error('[Google OAuth Prepare] Error:', err.message);
        return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

router.get('/google/start', (req, res) => {
    const { state } = req.query;
    if (!state) return res.status(400).send('state parameter is required');

    try {
        // Public endpoint verifies the signed state JWT (which contains validated tenantId & type)
        const decodedState = jwt.verify(state, INTERNAL_SECRET);
        const { tenantId, type } = decodedState;

        const oauth2Client = getGoogleOAuthClient(req);
        if (!oauth2Client) return res.status(500).send('Google credentials.json not found or invalid on server');

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent', 
            scope: SCOPES,
            state: state // Forward the signed state JWT itself
        });

        res.redirect(authUrl);
    } catch (jwtErr) {
        console.warn('[Google OAuth Security] Invalid or expired state JWT on /google/start:', jwtErr.message);
        return res.status(403).send('Forbidden: Invalid or expired state signature');
    }
});

router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
        return res.send(`Authorization failed: ${error}. <a href="/settings">Go back to settings</a>`);
    }

    if (!code || !state) return res.status(400).send('Invalid callback');

    try {
        // Verify JWT State signature
        let decodedState;
        try {
            decodedState = jwt.verify(state, INTERNAL_SECRET);
        } catch (jwtErr) {
            console.error('[Google OAuth Security] State validation failed (Signature error):', jwtErr.message);
            return res.status(403).send('Forbidden: Invalid state signature');
        }

        const tenantId = await handleGoogleCallback(code, state, req);
        console.log(`[Suite] Google OAuth successful for tenant: ${tenantId}`);
        res.redirect('/settings?tab=vault&google=success');
    } catch (e) {
        console.error('[Google OAuth] Callback Error:', e);
        res.status(500).send('Failed to exchange token. Error: ' + e.message);
    }
});

module.exports = router;
