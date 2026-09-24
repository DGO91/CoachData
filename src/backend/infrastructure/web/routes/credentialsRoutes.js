const express = require('express');
const { getSupabaseClient } = require('../../database/supabaseClient');
const { verifyInternalToken } = require('../middlewares/authMiddleware');
const { 
    saveLegacyCredentials, 
    getDecryptedTenantKeys, 
    getSafeTenantKeys, 
    upsertTenantKey 
} = require('../../../application/credentials/credentialsUseCase');

const router = express.Router();

// 1. GET /api/credentials (Legacy)
router.get('/credentials', async (req, res) => {
    const supabase = getSupabaseClient();
    const fs = require('fs');
    const path = require('path');
    
    // Check Gmail connection
    const tokenPath = path.join(process.cwd(), 'ORGANIZADOR DE EMAILS', 'token.json');
    const gmailConnected = fs.existsSync(tokenPath);

    const publicKeys = {
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_KEY: process.env.SUPABASE_KEY || '',
        gmailConnected,
        STRIPE_CONNECTED: !!process.env.STRIPE_API_KEY
    };

    const fallbackResponse = {
        ...publicKeys,
        ANTHROPIC_API_KEY: '', GOOGLE_API_KEY: '', OPENAI_API_KEY: '',
        WHATSAPP_PHONE: '', WHATSAPP_API_KEY: '', WHATSAPP_PROVIDER: 'evolution',
        GOOGLE_APPS_SCRIPT_URL: ''
    };

    if (!supabase) return res.json(fallbackResponse);

    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.json(fallbackResponse);

    try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user) throw new Error('Invalid session');

        const { data, error } = await supabase
            .from('user_credentials')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        
        return res.json({
            ...publicKeys,
            ANTHROPIC_API_KEY:      data?.anthropic_api_key      || '',
            GOOGLE_API_KEY:         data?.google_api_key         || '',
            OPENAI_API_KEY:         data?.openai_api_key         || '',
            WHATSAPP_PHONE:         data?.whatsapp_phone         || '',
            WHATSAPP_API_KEY:       data?.whatsapp_api_key       || '',
            WHATSAPP_PROVIDER:      data?.whatsapp_provider      || 'evolution',
            GOOGLE_APPS_SCRIPT_URL: data?.google_apps_script_url || ''
        });
    } catch (err) {
        return res.json(fallbackResponse);
    }
});

// 2. POST /api/save-credentials (Legacy)
router.post('/save-credentials', async (req, res) => {
    const supabase = getSupabaseClient();
    const updates = req.body || {};
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!supabase || !token) return res.status(401).json({ success: false, error: 'Unauthorized or misconfigured' });

    try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !user) throw new Error('Invalid session');

        await saveLegacyCredentials(user.id, updates);
        res.json({ success: true, message: 'Credentials saved successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. GET /api/internal/credentials/:tenantId
router.get('/internal/credentials/:tenantId', verifyInternalToken, async (req, res) => {
    try {
        const result = await getDecryptedTenantKeys(req.params.tenantId);
        res.json(result);
    } catch (err) {
        console.error('[Internal API] Error fetching credentials:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. GET /api/admin/tenants/:id/keys
router.get('/admin/tenants/:id/keys', async (req, res) => {
    try {
        const safeKeys = await getSafeTenantKeys(req.params.id);
        res.json(safeKeys);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. POST /api/admin/tenants/:id/keys
router.post('/admin/tenants/:id/keys', async (req, res) => {
    try {
        const { provider_type, provider_name, api_key_plaintext } = req.body;
        const tenant_id = req.params.id;
        
        const result = await upsertTenantKey(tenant_id, provider_type, provider_name, api_key_plaintext);
        if (result.ignored) {
            return res.json({ success: true, ignored: true });
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
