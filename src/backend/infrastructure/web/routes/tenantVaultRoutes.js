'use strict';

// Authenticated replacement for the never-mounted, unauthenticated
// GET/POST /api/admin/tenants/:id/keys in credentialsRoutes.js (blocked by
// scripts/security-audit.js on purpose — that file trusted :id from the URL
// with zero ownership check). This mounts under authMiddleware only and never
// trusts a client-supplied tenant id: it always resolves the caller's own
// `tenants` row from req.user, auto-provisioning one if none exists yet.
//
// Two tenant-creation conventions coexist in this codebase:
//   (a) syncAndGetTenants() sets tenants.id = profiles.id (= auth user id)
//   (b) createTenant() (admin-created) lets tenants.id be a fresh UUID,
//       linked instead via tenants.auth_user_id
// resolveOwnTenant() matches either, so both kinds of existing tenant rows
// keep working — it does not force one convention over the other.

const express = require('express');
const { getSupabaseClient } = require('../../database/supabaseClient');
const { getSafeTenantKeys, upsertTenantKey } = require('../../../application/credentials/credentialsUseCase');
const { validarCuerpo } = require('../validation/validarCuerpo');

const router = express.Router();

/* Esquema del cuerpo de POST /keys.
 *
 * No se restringe provider_name a una lista cerrada a propósito. En producción
 * hay dieciocho combinaciones de tipo y nombre, y Nango crea las suyas al
 * conectar una integración, así que una lista fija rompería lo que hoy
 * funciona. Se valida la forma: minúsculas, números y guion bajo, que es como
 * están escritas todas las que existen.
 *
 * api_key_plaintext admite hasta 16 KB porque las credenciales de Google no
 * son una clave suelta sino el JSON del token OAuth completo, con su token de
 * refresco y su caducidad.
 */
const ESQUEMA_CLAVE = {
    type: 'object',
    required: ['provider_name'],
    additionalProperties: false,
    properties: {
        provider_name: {
            type: 'string',
            minLength: 2,
            maxLength: 64,
            pattern: '^[a-z0-9_]+$'
        },
        provider_type: {
            type: 'string',
            minLength: 2,
            maxLength: 32,
            pattern: '^[a-z0-9_]+$'
        },
        api_key_plaintext: {
            type: 'string',
            maxLength: 16384
        }
    }
};

async function resolveOwnTenant(req) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const userId = req.user.id;

    const { data: existing, error } = await supabase
        .from('tenants')
        .select('*')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (existing) return existing;

    const { data: created, error: createErr } = await supabase
        .from('tenants')
        .insert([{
            id: userId,
            auth_user_id: userId,
            company_name: req.user.user_metadata?.full_name || req.user.email || 'New Tenant',
            primary_contact_email: req.user.email || '',
            active_package: 'Pending / Free Tier',
        }])
        .select()
        .single();

    if (createErr) throw createErr;
    return created;
}

router.get('/me', async (req, res) => {
    try {
        const tenant = await resolveOwnTenant(req);
        res.json({ id: tenant.id, company_name: tenant.company_name });
    } catch (err) {
        console.error('[TenantVault] /me error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/keys', async (req, res) => {
    try {
        const tenant = await resolveOwnTenant(req);
        const safeKeys = await getSafeTenantKeys(tenant.id);
        res.json(safeKeys);
    } catch (err) {
        console.error('[TenantVault] GET /keys error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/keys', validarCuerpo(ESQUEMA_CLAVE), async (req, res) => {
    try {
        const tenant = await resolveOwnTenant(req);
        const { provider_type, provider_name, api_key_plaintext } = req.body;

        const result = await upsertTenantKey(tenant.id, provider_type, provider_name, api_key_plaintext);
        if (result.ignored) return res.json({ success: true, ignored: true });
        res.json(result);
    } catch (err) {
        console.error('[TenantVault] POST /keys error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
