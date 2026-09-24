// src/backend/infrastructure/web/routes/intelligenceRoutes.js
const express = require('express');
const router = express.Router();
const agentRegistry = require('../../../application/orchestrator/AgentRegistry');
const executionPipeline = require('../../../application/orchestrator/ExecutionPipeline');
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
// El registro de auditoría en ai_agent_logs sí se escribe con service_role: un
// log del sistema no debe depender de los permisos de quien queda auditado.
const { getSupabaseClient } = require('../../database/supabaseClient');

/**
 * GET /api/intelligence/agents
 * Retorna la lista de todos los agentes registrados en el Orchestrator V2.
 */
router.get('/agents', (req, res) => {
  try {
    const agents = agentRegistry.list();
    return res.json({
      success: true,
      agents,
    });
  } catch (err) {
    console.error('[IntelligenceRoutes] Error listing agents:', err);
    return res.status(500).json({ error: 'Failed to list agents' });
  }
});

/**
 * POST /api/intelligence/execute
 * Ejecuta un agente específico de forma aislada y auditable.
 */
router.post('/execute', async (req, res) => {
  try {
    const { agent, input = {}, provider } = req.body;

    // El tenant sale del contexto que ya verificó tenantContextMiddleware contra
    // la membresía del usuario. Antes se leía `req.organizationId`, que ningún
    // middleware asigna, así que caía siempre a un UUID fijo y todas las
    // organizaciones ejecutaban agentes bajo la misma identidad.
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'No hay contexto de organización para ejecutar el agente'
      });
    }

    if (!agent) {
      return res.status(400).json({ error: 'Parámetro "agent" es requerido.' });
    }

    if (!agentRegistry.has(agent)) {
      return res.status(404).json({ error: `Agente '${agent}' no encontrado.` });
    }

    const result = await executionPipeline.execute({
      organizationId,
      agentName: agent,
      input,
      provider,
      // `req.supabase` tampoco lo asigna nadie: llegaba undefined y el pipeline
      // se saltaba en silencio el registro en ai_agent_logs, dejando las
      // ejecuciones de agentes sin auditoría.
      supabaseClient: getSupabaseClient(),
    });

    return res.json(result);
  } catch (err) {
    console.error('[IntelligenceRoutes] Error executing agent:', err);
    return res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

module.exports = router;
