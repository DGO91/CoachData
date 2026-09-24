const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { SUBSYSTEMS, runPersonalAgentUseCase, stopPersonalAgentUseCase, getPersonalAgentStatus } = require('../../../application/orchestrator/agentOrchestrator');
const { processesMap, startSubsystem } = require('../../agents/childProcessManager');
const { INTERNAL_SECRET } = require('../../../config/env');
const horarios = require('../../../application/agents/agentSchedulesService');
const runs = require('../../../application/agents/agentRunsService');

const router = express.Router();
const IS_DOCKER = process.env.DOCKER_ENV === 'true';

/* ---------- horarios de agente ----------

   Las tres pantallas de horario hacen lo mismo con distinto nombre de agente,
   así que la ruta solo dice cuál es el suyo. El contexto de organización lo
   pone tenantContextMiddleware en req.tenant; una petición que llegue sin él no
   se atiende, porque guardar sin saber de quién es el horario es justo el fallo
   que esto viene a corregir. */

function organizacionDe(req, res) {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
        res.status(400).json({ success: false, error: 'Falta el contexto de organización' });
        return null;
    }
    return organizationId;
}

async function horarioDeLaPeticion(req, res, agentType) {
    const organizationId = organizacionDe(req, res);
    if (!organizationId) return null;
    try {
        return await horarios.leerHorario(organizationId, agentType);
    } catch (err) {
        console.error(`[Agents] No se pudo leer el horario de ${agentType}:`, err.message);
        res.status(500).json({ success: false, error: 'No se pudo leer el horario' });
        return null;
    }
}

async function responderHorario(req, res, agentType) {
    const horario = await horarioDeLaPeticion(req, res, agentType);
    if (!horario) return;
    res.json({
        scheduleActive: horario.active,
        cronHour: horario.hour,
        cronMinute: horario.minute
    });
}

async function guardarYResponder(req, res, agentType) {
    const organizationId = organizacionDe(req, res);
    if (!organizationId) return;

    try {
        const horario = await horarios.guardarHorario(organizationId, agentType, req.body || {});
        console.log(`[Suite] Horario de ${agentType} actualizado para la organización ${organizationId}: activo=${horario.active}, ${horario.hour}:${String(horario.minute).padStart(2, '0')}`);
        res.json({
            success: true,
            message: 'Schedule updated',
            scheduleActive: horario.active,
            cronHour: horario.hour,
            cronMinute: horario.minute
        });
    } catch (err) {
        if (err instanceof horarios.HorarioInvalidoError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        console.error(`[Agents] No se pudo guardar el horario de ${agentType}:`, err.message);
        res.status(500).json({ success: false, error: 'No se pudo guardar el horario' });
    }
}

/* El estado de ejecución vive en agent_runs, con un candado por organización
   (migración 041). Lo único que no puede salir de este proceso es el mango del
   proceso hijo, que sólo sirve para matarlo desde la instancia que lo lanzó. */
const procesosPorOrganizacion = new Map();

/* El horario vive en agent_schedules, por organización. Ver
   application/agents/agentSchedulesService.js. */

/* Cada cuánto se refresca el latido de una ejecución viva. Tiene que ser
   bastante menor que la expiración del candado, o una ejecución larga se daría
   por perdida estando sana. */
const LATIDO_MS = 60_000;

/**
 * Lanza el Evening Summary de una organización, si nadie lo está corriendo ya
 * en esa organización. Devuelve { lanzado, motivo, runId }: que ya estuviera en
 * marcha es una respuesta normal, no un error.
 */
async function runEveningSummary(options = {}) {
    const tenantId = options.tenantId || options.req?.tenant?.id;
    if (!tenantId) {
        console.error('[EveningSummary Error] No se puede lanzar el agente sin organización.');
        return { lanzado: false, motivo: 'Falta el contexto de organización' };
    }

    const candado = await runs.tomarCandado(tenantId, 'evening_summary');
    if (!candado.tomado) {
        console.log(`[Suite] Evening Summary ya en curso para la organización ${tenantId}`);
        return { lanzado: false, motivo: candado.motivo };
    }

    const agentDir = path.join(process.cwd(), 'src/agents/evening_summary');
    console.log(`[Suite] Lanzando Evening Summary para la organización ${tenantId}...`);

    const env = { ...process.env };
    if (options.recipient) env.EVENING_SUMMARY_RECIPIENT = options.recipient;
    if (options.style) env.EVENING_SUMMARY_STYLE = options.style;

    const jwt = require('jsonwebtoken');
    const internalToken = jwt.sign({ role: 'internal-agent' }, INTERNAL_SECRET, { expiresIn: '5m' });

    const pythonPath = IS_DOCKER ? 'python3' : path.join(agentDir, 'venv', 'bin', 'python');

    let proc;
    try {
        proc = spawn(pythonPath, ['main.py', '--tenant', tenantId, '--token', internalToken], { cwd: agentDir, env });
    } catch (err) {
        /* Si el proceso no llega a arrancar hay que soltar el candado, o el
           agente queda bloqueado para esa organización hasta que expire. */
        await runs.soltarCandado(candado.runId, 'failed', { error: `No se pudo arrancar: ${err.message}` });
        console.error('[EveningSummary Error] No se pudo arrancar el proceso:', err.message);
        return { lanzado: false, motivo: 'No se pudo arrancar el agente' };
    }

    procesosPorOrganizacion.set(tenantId, proc);
    const latido = setInterval(() => { void runs.latir(candado.runId); }, LATIDO_MS);

    proc.stdout.on('data', (data) => {
        console.log(`[EveningSummary] ${data.toString().trim()}`);
    });

    proc.stderr.on('data', (data) => {
        console.error(`[EveningSummary STDERR] ${data.toString().trim()}`);
    });

    proc.on('error', (err) => {
        clearInterval(latido);
        procesosPorOrganizacion.delete(tenantId);
        void runs.soltarCandado(candado.runId, 'failed', { error: err.message });
        console.error('[EveningSummary Error]', err.message);
    });

    proc.on('close', (code) => {
        clearInterval(latido);
        procesosPorOrganizacion.delete(tenantId);
        const ok = code === 0;
        void runs.soltarCandado(candado.runId, ok ? 'completed' : 'failed',
            ok ? {} : { error: `El agente terminó con código ${code}` });
        console.log(ok
            ? `[Suite] Evening Summary completado para la organización ${tenantId}.`
            : `[Suite] Evening Summary falló con código ${code} para la organización ${tenantId}.`);
    });

    return { lanzado: true, runId: candado.runId };
}

function runEveningSummaryPreview(req, res) {
    const agentDir = path.join(process.cwd(), 'src/agents/evening_summary');
    console.log('[Suite] Running Evening Summary Agent in PREVIEW mode...');
    
    // We pass any necessary environment variables if needed
    const env = { ...process.env };
    
    // If the frontend sent configuration overrides, we could pass them here
    if (req.query.recipient) env.EVENING_SUMMARY_RECIPIENT = req.query.recipient;
    if (req.query.style) env.EVENING_SUMMARY_STYLE = req.query.style;

    const pythonPath = IS_DOCKER ? 'python3' : path.join(agentDir, 'venv', 'bin', 'python');
    const proc = spawn(pythonPath, ['main.py', '--preview'], { cwd: agentDir, env });
    
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    proc.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`[EveningSummary Preview STDERR] ${data.toString().trim()}`);
    });

    proc.on('close', (code) => {
        if (code === 0) {
            // Parse stdout to find the report between ###REPORT_START### and ###REPORT_END###
            const match = stdoutData.match(/###REPORT_START###([\s\S]*?)###REPORT_END###/);
            const report = match ? match[1].trim() : "Failed to parse report output.\n" + stdoutData;
            res.json({ success: true, preview: report });
        } else {
            console.error(`[Suite] Evening Summary Agent Preview failed with code ${code}.`);
            res.status(500).json({ success: false, error: 'Agent failed', details: stderrData });
        }
    });
}

// 1. Global health check with 5s memory cache to prevent event-loop overload
/* Caché por organización. Era una sola variable para todo el proceso, así que
   durante cinco segundos una organización recibía el estado calculado para
   otra. La clave es el id de la organización. */
const statusCachePorOrganizacion = new Map();
const STATUS_CACHE_TTL_MS = 5000;

router.get('/status', async (req, res) => {
    const organizationId = organizacionDe(req, res);
    if (!organizationId) return;

    const now = Date.now();
    const enCache = statusCachePorOrganizacion.get(organizationId);
    if (enCache && (now - enCache.timestamp < STATUS_CACHE_TTL_MS)) {
        return res.json({ ...enCache.payload, cached: true, cacheAgeMs: now - enCache.timestamp });
    }

    /* La salud del Evening Summary sale de su última ejecución registrada, no
       de una variable del proceso que se perdía en cada despliegue. */
    const ultimaCena = await runs.ultimaEjecucion(organizationId, 'evening_summary');
    const cenaFalló = ultimaCena ? ultimaCena.state === 'failed' : false;

    const results = await Promise.all(SUBSYSTEMS.map(async (s) => {
        const start = Date.now();
        if (s.headless) {
            let isHealthy = false;
            let errorMsg = null;
            if (s.key === 'evening-summary') {
                const scriptPath = path.join(process.cwd(), 'src/agents/evening_summary', 'main.py');
                const scriptExists = fs.existsSync(scriptPath);
                isHealthy = scriptExists && !cenaFalló;
                errorMsg = scriptExists ? (cenaFalló ? (ultimaCena.error || 'Last execution failed') : null) : 'main.py missing';
            } else if (s.key === 'personal-agent') {
                const scriptPath = path.join(process.cwd(), 'src/agents/personal_agent', 'AGENTES', 'PersonalAgent', 'briefing.py');
                const scriptExists = fs.existsSync(scriptPath);
                const { lastRunSuccess } = getPersonalAgentStatus();
                isHealthy = scriptExists && lastRunSuccess !== false;
                errorMsg = scriptExists ? (lastRunSuccess === false ? 'Last execution failed' : null) : 'briefing.py missing';
            } else {
                isHealthy = true;
            }
            return {
                ...s,
                up: isHealthy,
                status: isHealthy ? 200 : 500,
                latencyMs: Date.now() - start,
                error: errorMsg
            };
        }
        try {
            const ac = new AbortController();
            const t = setTimeout(() => ac.abort(), 1500);
            let hostname = IS_DOCKER ? `coachdata_agent_${s.key.replace(/-/g, '_')}` : 'localhost';
            if (s.key === 'knowledge-agent') {
                hostname = IS_DOCKER ? 'coachdata_agent_knowledge' : 'localhost';
            }
            const r = await fetch(`http://${hostname}:${s.port}/`, { signal: ac.signal });
            clearTimeout(t);
            return { ...s, up: r.status < 500, status: r.status, latencyMs: Date.now() - start };
        } catch (e) {
            return { ...s, up: false, status: 0, latencyMs: Date.now() - start, error: e.message };
        }
    }));

    const responsePayload = { ok: results.every(r => r.up), services: results };
    statusCachePorOrganizacion.set(organizationId, { payload: responsePayload, timestamp: now });

    res.json({ ...responsePayload, cached: false });
});

// 2. Auto-Healing
router.post('/restart-subsystem', async (req, res) => {
    const { key } = req.body;

    if (key === 'evening-summary') {
        const organizationId = organizacionDe(req, res);
        if (!organizationId) return;

        /* No se comprueba antes si está corriendo: el candado lo decide, y así
           dos peticiones a la vez no pueden lanzar dos veces el agente. */
        const resultado = await runEveningSummary({ tenantId: organizationId });
        return res.json({
            success: resultado.lanzado,
            message: resultado.lanzado
                ? 'Evening Summary Agent manual run triggered.'
                : resultado.motivo
        });
    }

    if (!processesMap.has(key)) {
        return res.status(404).json({ success: false, message: 'Subsystem not found' });
    }
    const config = processesMap.get(key);
    console.log(`[Suite] Auto-healing triggered for ${config.name}...`);
    
    // Kill existing process if alive
    if (config.proc) {
        config.proc.kill('SIGKILL');
    }
    
    // Relaunch
    const newProc = startSubsystem(config.name, config.command, config.args, config.cwd, config.port);
    config.proc = newProc;
    
    res.json({ success: true, message: `Subsystem ${config.name} restarted.` });
});

// 3. Personal Agent
router.post('/run-personal-agent', (req, res) => {
    const { tenantId = 'default_tenant' } = req.body || {};
    const { isRunning } = getPersonalAgentStatus();
    if (isRunning) return res.status(400).json({ error: 'Agent is already running' });
    runPersonalAgentUseCase(tenantId, process.cwd(), () => {});
    res.json({ message: 'Personal Agent started successfully' });
});

router.post('/stop-personal-agent', (req, res) => {
    const success = stopPersonalAgentUseCase();
    if (!success) return res.status(400).json({ error: 'Personal Agent is not running' });
    res.json({ message: 'Personal Agent stopped successfully' });
});

router.get('/personal-agent-status', (req, res) => {
    const { isRunning, lastRunSuccess } = getPersonalAgentStatus();
    res.json({
        running: isRunning,
        lastSuccess: lastRunSuccess,
        nextRun: global.personalAgentCron ? global.personalAgentCron.nextDates(1).toDate() : null
    });
});

router.get('/personal-agent-schedule', (req, res) => responderHorario(req, res, 'morning_briefing'));

router.post('/set-personal-agent-schedule', (req, res) => guardarYResponder(req, res, 'morning_briefing'));

// 4. Evening Summary Agent
router.post('/run-evening-summary', async (req, res) => {
    const isPreview = req.query.preview === 'true';

    if (isPreview) {
        // Run in preview mode and return the text
        return runEveningSummaryPreview(req, res);
    }

    const organizationId = organizacionDe(req, res);
    if (!organizationId) return;

    /* El candado decide si se lanza: lo que antes era una variable global del
       proceso, y por tanto compartida entre todas las organizaciones. */
    const resultado = await runEveningSummary({
        recipient: req.query.recipient,
        style: req.query.style,
        tenantId: organizationId
    });

    if (!resultado.lanzado) {
        return res.json({ success: false, message: resultado.motivo });
    }
    res.json({ success: true, message: 'Evening Summary started in background', runId: resultado.runId });
});

router.post('/stop-evening-summary', async (req, res) => {
    const organizationId = organizacionDe(req, res);
    if (!organizationId) return;

    const activa = await runs.ejecucionActiva(organizationId, 'evening_summary');
    if (!activa) {
        return res.json({ success: false, message: 'Agent is not running' });
    }

    /* El proceso hijo sólo se puede matar desde la instancia que lo lanzó. Si
       la ejecución salió de otra, se marca como cancelada y esa instancia lo
       recogerá al cerrar; decir que se ha parado cuando sigue vivo sería
       mentir. */
    const proc = procesosPorOrganizacion.get(organizationId);
    if (proc) proc.kill();

    await runs.soltarCandado(activa.id, 'cancelled', { error: 'Parada solicitada desde el panel' });

    res.json({
        success: true,
        message: proc
            ? 'Evening Summary stopped'
            : 'Ejecución marcada como cancelada; la instancia que la lanzó la cerrará'
    });
});

router.get('/evening-summary-status', async (req, res) => {
    const horario = await horarioDeLaPeticion(req, res, 'evening_summary');
    if (!horario) return;

    const organizationId = req.tenant.id;
    const [activa, ultima] = await Promise.all([
        runs.ejecucionActiva(organizationId, 'evening_summary'),
        runs.ultimaEjecucion(organizationId, 'evening_summary')
    ]);

    res.json({
        running: Boolean(activa),
        /* null mientras no haya terminado ninguna: es distinto de "falló". */
        lastSuccess: ultima && ultima.state !== 'active' ? ultima.state === 'completed' : null,
        lastError: ultima?.error ?? null,
        scheduleActive: horario.active,
        cronHour: horario.hour,
        cronMinute: horario.minute,
        timezone: horario.timezone
    });
});

router.post('/set-evening-summary-schedule', (req, res) => guardarYResponder(req, res, 'evening_summary'));

// 5. Pre-Call Agent Schedule

router.get('/precall-schedule-status', async (req, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant context' });
    }

    const { getSafeTenantKeys } = require('../../../application/credentials/credentialsUseCase');
    let gmailTokenExists = false;
    let calendarTokenExists = false;
    try {
        const keys = await getSafeTenantKeys(tenantId);
        const hasGoogle = keys.some(k => k.provider_name.includes('google'));
        gmailTokenExists = hasGoogle;
        calendarTokenExists = hasGoogle;
    } catch (e) {
        console.error('[Agents] precall-schedule-status: failed to load tenant keys', e.message);
    }

    const horario = await horarios.leerHorario(tenantId, 'pre_call');

    res.json({
        scheduleActive: horario.active,
        cronHour: horario.hour,
        cronMinute: horario.minute,
        gmailConnected: gmailTokenExists,
        calendarConnected: calendarTokenExists
    });
});

router.post('/set-precall-schedule', (req, res) => guardarYResponder(req, res, 'pre_call'));

module.exports = {
    router,
    runEveningSummary
};
