const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../../database/supabaseClient');

/**
 * GET /api/system/health
 * Endpoint de monitoreo seguro de salud del sistema y servicios extendido (Sprint 7.1).
 */
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  let dbLatencyMs = -1;
  let dbStatus = 'disconnected';

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const dbStart = Date.now();
      const { error, status } = await supabase.from('organizations').select('id').limit(1);
      dbLatencyMs = Date.now() - dbStart;
      if (!error) {
        dbStatus = 'connected';
      } else if (status > 0 && status < 500) {
        // La base contestó, pero negó el acceso: pasa con la clave pública
        // (CI), que no puede leer organizations. Para salud cuenta como viva;
        // lo que interesa aquí es si responde, no qué deja ver.
        dbStatus = 'connected_restricted';
      } else {
        dbStatus = 'error';
      }
    }
  } catch (err) {
    dbStatus = 'error';
  }

  // Antes respondía 200 con status 'ok' aunque la base estuviera caída, y un
  // monitor externo, que solo mira el código HTTP, nunca se habría enterado.
  const healthy = dbStatus === 'connected' || dbStatus === 'connected_restricted';

  try {
    return res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      environment: process.env.NODE_ENV || 'production',
      version: 'v0.7.1',
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      // Only metrics this endpoint actually measures. Previous fields
      // (realtimeConnectivity, aiOrchestratorStatus, activeWebsocketChannels,
      // pendingFailedJobs) were hardcoded constants, not real signal — removed
      // rather than left as fake data. Add them back once there's a real source.
      metrics: {
        databaseLatencyMs: dbLatencyMs,
        databaseStatus: dbStatus,
      },
      services: {
        supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY)),
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
    });
  }
});

module.exports = router;
