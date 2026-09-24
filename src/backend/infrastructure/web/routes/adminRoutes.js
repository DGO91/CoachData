/**
 * adminRoutes.js
 *
 * Rutas de administración, montadas en /api/admin.
 *
 * Antes vivían dentro de userRoutes y tenantRoutes con el prefijo /admin/…
 * escrito a mano en cada ruta, pero esos routers se montan en /api/users y
 * /api/admin/tenants respectivamente. El resultado eran rutas inalcanzables:
 *   - /api/admin/users   → no existía (caía al index.html del SPA, y el
 *                          res.json() del frontend reventaba con un 200)
 *   - /api/admin/tenants → habría sido /api/admin/tenants/admin/tenants
 * Aquí el prefijo lo pone el montaje una sola vez.
 */
const express = require('express');
const {
    syncAndGetTenants,
    createTenant,
    updateTenantPackage
} = require('../../../application/tenant/tenantUseCase');
const {
    getAdminUsers,
    updateEnabledAgents
} = require('../../../application/auth/userUseCase');

const router = express.Router();

/* ── Tenants ── */

router.get('/tenants', async (req, res) => {
    try {
        const tenants = await syncAndGetTenants();
        res.json(tenants);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tenants', async (req, res) => {
    try {
        const tenant = await createTenant(req.body);
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/tenants/:id', async (req, res) => {
    try {
        const tenant = await updateTenantPackage(req.params.id, req.body.active_package);
        res.json(tenant);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── Usuarios ── */

router.get('/users', async (req, res) => {
    try {
        const users = await getAdminUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/users/:id/agents', async (req, res) => {
    try {
        const data = await updateEnabledAgents(req.params.id, req.body.enabled_agents);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ── Waitlist ── */
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
const { devMemoryWaitlist } = require('./publicWaitlistRoutes');

router.get('/waitlist', async (req, res) => {
    try {
        const supabase = dbDeUsuario(req, res);
        if (supabase) {
            const { data, error } = await supabase
                .from('waitlist')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && Array.isArray(data)) {
                const mapped = data.map(w => ({
                    id: w.id,
                    email: w.email,
                    name: w.name,
                    role: w.role,
                    source: w.source,
                    locale: w.locale,
                    createdAt: w.created_at,
                    contactedAt: w.contacted_at
                }));
                return res.json({ success: true, waitlist: mapped });
            }
        }

        const devItems = Array.from(devMemoryWaitlist.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json({ success: true, waitlist: devItems });
    } catch (err) {
        console.error('[AdminRoutes] Error fetching waitlist:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
