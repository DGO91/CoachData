'use strict';

const express = require('express');
const { getSupabaseClient } = require('../../database/supabaseClient');
const { decrypt } = require('../../services/encryptionService');

const router = express.Router();

/**
 * Puente de mando de la agencia: una fila por cliente con lo que puede ir mal.
 *
 * Sin esto, cada cliente nuevo suma soporte reactivo: te enteras de que a alguien
 * se le cayó una integración cuando te escribe. Con esto el problema se ve antes
 * de que el coach lo note, que es literalmente lo que se vende.
 *
 * No usa tenantContextMiddleware: precisamente mira POR ENCIMA de la
 * organización. El acceso lo controla requirePlatformAdmin.
 */

const HORAS_SILENCIO = 48;

router.get('/overview', async (req, res) => {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(503).json({ error: 'Base de datos no configurada' });

    try {
        const desde24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const limiteSilencio = Date.now() - HORAS_SILENCIO * 3600 * 1000;

        // Se leen los conjuntos completos y se cruzan en memoria. Son decenas de
        // organizaciones, no miles: una consulta por cliente multiplicaría los
        // viajes a la base sin ganar nada.
        const [orgs, membresias, tenants, credenciales, eventos, logs, alertas] = await Promise.all([
            supabase.from('organizations').select('id, name, slug, plan_tier, created_at'),
            supabase.from('organization_memberships').select('organization_id, user_id, role'),
            supabase.from('tenants').select('id, auth_user_id, organization_id'),
            supabase.from('client_provider_keys').select('tenant_id, provider_name, api_key_encrypted'),
            supabase.from('webhook_inbox').select('organization_id, provider, status, received_at')
                .order('received_at', { ascending: false }).limit(2000),
            supabase.from('ai_agent_logs').select('organization_id, status, created_at').gte('created_at', desde24h),
            supabase.from('agent_reports').select('organization_id, agent_type, is_read')
                .eq('agent_type', 'integration_health').eq('is_read', false),
        ]);

        const err = [orgs, membresias, tenants, credenciales, eventos, logs, alertas].find(r => r.error);
        if (err) throw err.error;

        // Las credenciales cuelgan del modelo antiguo de `tenants`, ligado al
        // usuario de auth y no a la organización. Hay que resolver el puente.
        const tenantsPorOrg = new Map();
        for (const t of tenants.data || []) {
            const claves = [t.organization_id].filter(Boolean);
            for (const m of membresias.data || []) {
                if (m.user_id === t.auth_user_id || m.user_id === t.id) claves.push(m.organization_id);
            }
            for (const orgId of new Set(claves)) {
                if (!tenantsPorOrg.has(orgId)) tenantsPorOrg.set(orgId, new Set());
                tenantsPorOrg.get(orgId).add(t.id);
            }
        }

        const filas = (orgs.data || []).map(org => {
            const misTenants = tenantsPorOrg.get(org.id) || new Set();

            let credencialesRotas = 0;
            for (const c of credenciales.data || []) {
                if (!misTenants.has(c.tenant_id) || !c.api_key_encrypted) continue;
                try { decrypt(c.api_key_encrypted); } catch { credencialesRotas++; }
            }

            const mios = (eventos.data || []).filter(e => e.organization_id === org.id);
            const ultimoPorProveedor = new Map();
            for (const e of mios) {
                if (!ultimoPorProveedor.has(e.provider)) ultimoPorProveedor.set(e.provider, e.received_at);
            }
            const conectoresEnSilencio = [...ultimoPorProveedor.values()]
                .filter(f => new Date(f).getTime() < limiteSilencio).length;

            const misLogs = (logs.data || []).filter(l => l.organization_id === org.id);
            const alertaAbierta = (alertas.data || []).some(a => a.organization_id === org.id);

            const problemas = credencialesRotas + conectoresEnSilencio
                + mios.filter(e => e.status === 'discarded').length;

            return {
                organizationId: org.id,
                nombre: org.name,
                slug: org.slug,
                plan: org.plan_tier || null,
                creada: org.created_at,
                miembros: (membresias.data || []).filter(m => m.organization_id === org.id).length,
                integraciones: {
                    conectores: ultimoPorProveedor.size,
                    enSilencio: conectoresEnSilencio,
                    credencialesRotas,
                    ultimoEvento: mios[0]?.received_at || null,
                    eventosDescartados: mios.filter(e => e.status === 'discarded').length,
                },
                agentes24h: {
                    ejecuciones: misLogs.length,
                    fallos: misLogs.filter(l => l.status !== 'success').length,
                },
                alertaAbierta,
                // Un solo número para poder ordenar por "a quién hay que mirar
                // primero" sin leer la fila entera.
                problemas,
            };
        }).sort((a, b) => b.problemas - a.problemas);

        res.json({
            generadoEn: new Date().toISOString(),
            organizaciones: filas.length,
            conProblemas: filas.filter(f => f.problemas > 0).length,
            clientes: filas,
        });
    } catch (e) {
        console.error('[Platform] Error componiendo el resumen:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
