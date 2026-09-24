// src/backend/infrastructure/web/routes/agentMemoryRoutes.js
const express = require('express');
const router = express.Router();
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');

/**
 * GET /api/agents/memory
 * Retrieves shared memory / client intelligence records for the organization.
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const { query, entity_type, limit = 50 } = req.query;

    const supabase = dbDeUsuario(req, res);
    if (!supabase) {
      return res.json({ success: true, memory: [] });
    }

    let dbQuery = supabase
      .from('client_intelligence_vault')
      .select('*')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit, 10) || 50);

    if (entity_type && entity_type !== 'all') {
      dbQuery = dbQuery.eq('entity_type', entity_type);
    }

    if (query) {
      dbQuery = dbQuery.or(`entity_name.ilike.%${query}%,entity_email.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, memory: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/agents/memory
 * Upserts client intelligence from any agent (Prospect Analyzer, Pre-Call, Auto Plan, etc.)
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const { entity_name, entity_email, entity_type = 'prospect', insights = {}, source_agent = 'manual' } = req.body;

    if (!entity_name) {
      return res.status(400).json({ success: false, error: 'entity_name is required' });
    }

    const supabase = dbDeUsuario(req, res);
    if (!supabase) {
      return res.json({
        success: true,
        record: { id: 'local-mock', entity_name, entity_email, entity_type, insights, source_agent }
      });
    }

    // Check if an entry with matching name or email exists for this organization
    let existingQuery = supabase
      .from('client_intelligence_vault')
      .select('id, insights')
      .eq('organization_id', organizationId)
      .eq('entity_name', entity_name)
      .limit(1);

    const { data: existingRecords } = await existingQuery;

    let result = null;

    if (existingRecords && existingRecords.length > 0) {
      const existing = existingRecords[0];
      const mergedInsights = { ...(existing.insights || {}), ...insights };
      
      const { data, error } = await supabase
        .from('client_intelligence_vault')
        .update({
          insights: mergedInsights,
          source_agent,
          entity_email: entity_email || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('client_intelligence_vault')
        .insert({
          organization_id: organizationId,
          entity_name,
          entity_email: entity_email || null,
          entity_type,
          insights,
          source_agent,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.json({ success: true, record: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
