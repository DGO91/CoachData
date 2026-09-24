'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');
const { decrypt } = require('../../infrastructure/services/encryptionService');

/**
 * Vigilancia de integraciones caídas.
 *
 * Había endpoint de estado de conexión, pero nadie avisaba: el coach descubría
 * que llevaba una semana sin datos al abrir el panel y encontrarlo igual que
 * ayer. En un producto que se vende como "te digo qué pasa en tu negocio", esa
 * es la peor forma de fallar, porque calla en vez de romperse.
 *
 * Las alertas se escriben como un reporte más en agent_reports, que ya tiene
 * bandeja de no leídos y aparece en el buzón del panel. No hay infraestructura de
 * correo en este proyecto y montarla para esto sería desproporcionado: el sitio
 * donde el coach ya mira es el sitio correcto.
 */

const TIPO_REPORTE = 'integration_health';

// Sin eventos durante más de dos días naturales se considera caída. Un coach
// puede pasar un fin de semana sin cobrar nada ni tener sesiones, así que un
// umbral más corto generaría alertas falsas cada lunes.
const HORAS_SIN_EVENTOS = 48;

/**
 * Credenciales que ya no se pueden descifrar. Es el fallo más grave porque no se
 * arregla reintentando: la clave con que se cifraron no está, y el dueño tiene
 * que volver a conectar la herramienta.
 */
async function credencialesIlegibles(supabase, tenantIds) {
    if (!tenantIds.length) return [];
    const { data, error } = await supabase
        .from('client_provider_keys')
        .select('id, tenant_id, provider_name, api_key_encrypted')
        .in('tenant_id', tenantIds);
    if (error) throw error;

    const rotas = [];
    for (const fila of data || []) {
        if (!fila.api_key_encrypted) continue;
        try {
            decrypt(fila.api_key_encrypted);
        } catch {
            rotas.push({ proveedor: fila.provider_name, tenantId: fila.tenant_id });
        }
    }
    return rotas;
}

/**
 * Conectores que recibieron algo alguna vez y llevan demasiado callados. Un
 * conector que nunca recibió nada no se reporta: eso no es una caída, es una
 * integración que aún no se ha usado, y confundirlas llenaría el buzón de ruido
 * el primer día.
 */
async function conectoresEnSilencio(supabase, organizationId) {
    const { data, error } = await supabase
        .from('webhook_inbox')
        .select('provider, received_at')
        .eq('organization_id', organizationId)
        .order('received_at', { ascending: false })
        .limit(500);
    if (error) throw error;

    const ultimoPorProveedor = new Map();
    for (const fila of data || []) {
        if (!ultimoPorProveedor.has(fila.provider)) {
            ultimoPorProveedor.set(fila.provider, fila.received_at);
        }
    }

    const limite = Date.now() - HORAS_SIN_EVENTOS * 3600 * 1000;
    const callados = [];
    for (const [proveedor, ultimo] of ultimoPorProveedor) {
        const cuando = new Date(ultimo).getTime();
        if (cuando < limite) {
            callados.push({
                proveedor,
                ultimoEvento: ultimo,
                horas: Math.floor((Date.now() - cuando) / 3600000),
            });
        }
    }
    return callados;
}

/** Eventos que el consumidor no consiguió procesar y ya no reintentará. */
async function eventosDescartados(supabase, organizationId) {
    const { data, error } = await supabase
        .from('webhook_inbox')
        .select('provider, last_error, received_at')
        .eq('organization_id', organizationId)
        .eq('status', 'discarded')
        .order('received_at', { ascending: false })
        .limit(20);
    if (error) throw error;
    return data || [];
}

function redactarInforme({ rotas, callados, descartados }) {
    const lineas = [];

    if (rotas.length) {
        lineas.push('## Conexiones que hay que volver a autorizar\n');
        lineas.push('Estas credenciales ya no se pueden leer. No se arreglan solas: hay que reconectar la herramienta desde la Bóveda de Seguridad.\n');
        for (const r of rotas) lineas.push(`- **${r.proveedor}**`);
        lineas.push('');
    }

    if (callados.length) {
        lineas.push('## Herramientas que llevan tiempo sin enviar nada\n');
        for (const c of callados) {
            const dias = Math.floor(c.horas / 24);
            lineas.push(`- **${c.proveedor}** — último dato hace ${dias > 0 ? `${dias} día${dias === 1 ? '' : 's'}` : `${c.horas} horas`}`);
        }
        lineas.push('\nSi has estado usando esa herramienta con normalidad, la conexión se ha cortado.\n');
    }

    if (descartados.length) {
        lineas.push('## Datos que no se pudieron registrar\n');
        const porProveedor = new Map();
        for (const d of descartados) {
            porProveedor.set(d.provider, (porProveedor.get(d.provider) || 0) + 1);
        }
        for (const [proveedor, n] of porProveedor) {
            lineas.push(`- **${proveedor}** — ${n} ${n === 1 ? 'evento' : 'eventos'} sin registrar`);
        }
        lineas.push('');
    }

    return lineas.join('\n');
}

/**
 * Revisa una organización y deja una alerta si hay algo que contar.
 *
 * No repite: si ya hay una alerta sin leer, se actualiza en lugar de crear otra.
 * Sin eso, una integración caída generaría un reporte nuevo en cada vuelta y
 * enterraría el resto del buzón en un día.
 */
async function revisarOrganizacion(organizationId, tenantIds = []) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase no está configurado');

    const [rotas, callados, descartados] = await Promise.all([
        credencialesIlegibles(supabase, tenantIds),
        conectoresEnSilencio(supabase, organizationId),
        eventosDescartados(supabase, organizationId),
    ]);

    const problemas = rotas.length + callados.length + descartados.length;

    const { data: abierta } = await supabase
        .from('agent_reports')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('agent_type', TIPO_REPORTE)
        .eq('is_read', false)
        .maybeSingle();

    if (problemas === 0) {
        // Todo en orden: si quedaba una alerta abierta, se cierra sola. Es lo que
        // convierte el buzón en un estado y no en un registro histórico.
        if (abierta) {
            await supabase.from('agent_reports')
                .update({ is_read: true, updated_at: new Date().toISOString() })
                .eq('id', abierta.id);
        }
        return { organizationId, problemas: 0, accion: abierta ? 'resuelta' : 'ninguna' };
    }

    const titulo = rotas.length
        ? 'Hay conexiones que necesitan tu atención'
        : 'Una herramienta conectada dejó de enviar datos';

    const resumen = [
        rotas.length ? `${rotas.length} por reconectar` : null,
        callados.length ? `${callados.length} sin enviar datos` : null,
        descartados.length ? `${descartados.length} eventos sin registrar` : null,
    ].filter(Boolean).join(' · ');

    const fila = {
        organization_id: organizationId,
        agent_type: TIPO_REPORTE,
        title: titulo,
        summary: resumen,
        content_markdown: redactarInforme({ rotas, callados, descartados }),
        metadata: {
            credenciales_ilegibles: rotas.length,
            conectores_en_silencio: callados.length,
            eventos_descartados: descartados.length,
            revisado_en: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
    };

    if (abierta) {
        await supabase.from('agent_reports').update(fila).eq('id', abierta.id);
        return { organizationId, problemas, accion: 'actualizada' };
    }

    await supabase.from('agent_reports').insert(fila);
    return { organizationId, problemas, accion: 'creada' };
}

/** Recorre todas las organizaciones con miembros. */
async function revisarTodas() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: membresias, error } = await supabase
        .from('organization_memberships')
        .select('organization_id, user_id');
    if (error) throw error;

    const orgs = [...new Set((membresias || []).map(m => m.organization_id))];
    const usuariosPorOrg = new Map();
    for (const m of membresias || []) {
        if (!usuariosPorOrg.has(m.organization_id)) usuariosPorOrg.set(m.organization_id, []);
        usuariosPorOrg.get(m.organization_id).push(m.user_id);
    }

    const resultados = [];
    for (const orgId of orgs) {
        try {
            // Las credenciales cuelgan del modelo antiguo de `tenants`, ligado al
            // usuario de auth y no a la organización. Se resuelven por los
            // miembros para no dejarlas fuera de la revisión.
            const { data: tn } = await supabase
                .from('tenants')
                .select('id')
                .or(usuariosPorOrg.get(orgId).map(u => `id.eq.${u},auth_user_id.eq.${u}`).join(','));
            resultados.push(await revisarOrganizacion(orgId, (tn || []).map(t => t.id)));
        } catch (err) {
            console.error(`[IntegrationHealth] Falló la revisión de ${orgId}: ${err.message}`);
            resultados.push({ organizationId: orgId, error: err.message });
        }
    }
    return resultados;
}

module.exports = {
    revisarOrganizacion,
    revisarTodas,
    TIPO_REPORTE,
    HORAS_SIN_EVENTOS,
};
