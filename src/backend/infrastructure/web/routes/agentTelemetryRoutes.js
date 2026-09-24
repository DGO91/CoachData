'use strict';

const express = require('express');
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');

const router = express.Router();

/**
 * Telemetría de agentes: qué se ejecutó, cuándo y con qué resultado.
 *
 * La tabla ai_agent_logs y su migración existían desde el principio, pero nunca
 * se escribió una fila: ExecutionPipeline envolvía el insert en un
 * `if (supabaseClient)` y el cliente llegaba undefined porque la ruta le pasaba
 * `req.supabase`, un campo que ningún middleware asigna. El registro se saltaba
 * en silencio.
 *
 * Sin esto no se puede prometer nada medible: no había forma de saber si el
 * brief matutino llegó a ejecutarse.
 */

const VENTANA_HORAS = 24;

router.get('/', async (req, res) => {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
        return res.status(403).json({ error: 'Forbidden', message: 'No hay contexto de organización' });
    }

    const supabase = dbDeUsuario(req, res);
    if (!supabase) return;   // dbDeUsuario ya respondió 401

    const horas = Math.min(parseInt(req.query.hours, 10) || VENTANA_HORAS, 24 * 30);
    const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString();

    try {
        const { data, error } = await supabase
            .from('ai_agent_logs')
            .select('agent_name, status, duration_ms, error_message, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', desde)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        // Se agrupa por agente en el servidor: la pantalla necesita el resumen,
        // no quinientas filas que tendría que recorrer en el navegador.
        const porAgente = new Map();
        for (const fila of data || []) {
            if (!porAgente.has(fila.agent_name)) {
                porAgente.set(fila.agent_name, {
                    agente: fila.agent_name,
                    ejecuciones: 0,
                    fallos: 0,
                    duracionTotal: 0,
                    ultimaEjecucion: fila.created_at,
                    ultimoError: null,
                });
            }
            const a = porAgente.get(fila.agent_name);
            a.ejecuciones++;
            if (fila.status !== 'success') {
                a.fallos++;
                if (!a.ultimoError) a.ultimoError = fila.error_message || 'Sin detalle';
            }
            a.duracionTotal += fila.duration_ms || 0;
        }

        const agentes = [...porAgente.values()].map(a => ({
            agente: a.agente,
            ejecuciones: a.ejecuciones,
            fallos: a.fallos,
            duracionMedia: a.ejecuciones ? Math.round(a.duracionTotal / a.ejecuciones) : 0,
            ultimaEjecucion: a.ultimaEjecucion,
            ultimoError: a.ultimoError,
        })).sort((x, y) => y.ejecuciones - x.ejecuciones);

        res.json({
            ventanaHoras: horas,
            totalEjecuciones: (data || []).length,
            totalFallos: agentes.reduce((n, a) => n + a.fallos, 0),
            agentes,
        });
    } catch (err) {
        console.error('[AgentTelemetry] Error leyendo ai_agent_logs:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
