// src/backend/infrastructure/web/routes/agentReportsRoutes.js
//
// PRIMERA RUTA MIGRADA AL CLIENTE POR PETICIÓN.
//
// Consulta con `req.db`, que lleva el JWT del usuario, en lugar de con
// getSupabaseClient(), que usa service_role y salta RLS. El filtro explícito por
// organization_id se mantiene: no sobra: sigue acotando la consulta y evita
// traerse filas que la política descartaría después. La diferencia es que ahora,
// si alguien lo olvida, Postgres lo detiene.
//
// Se eligió esta ruta como piloto por ser pequeña, estar ya bien filtrada y
// tener políticas propias desde la migración 023.
const express = require('express');
const router = express.Router();

// El cliente con identidad de usuario lo deja userScopedClientMiddleware en
// req.db. Si no llegara —petición sin cabecera de sesión—, se corta: caer a
// service_role aquí devolvería datos saltándose las políticas.
function clienteDelUsuario(req, res) {
  if (!req.db) {
    res.status(401).json({ success: false, error: 'Sesión no válida para consultar datos' });
    return null;
  }
  return req.db;
}

/**
 * GET /api/agents/reports
 * Lists reports for the authenticated organization.
 */
router.get('/', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const { agent_type, limit = 20 } = req.query;

    const supabase = clienteDelUsuario(req, res);
    if (!supabase) return;   // clienteDelUsuario ya respondió 401

    let query = supabase
      .from('agent_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10) || 20);

    if (agent_type && agent_type !== 'all') {
      query = query.eq('agent_type', agent_type);
    }

    if (req.query.unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, reports: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/agents/reports
 * Deposites a newly generated report for the organization.
 */
router.post('/', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const { agent_type, title, summary, content_markdown, metadata } = req.body;

    if (!agent_type || !title || !content_markdown) {
      return res.status(400).json({ success: false, error: 'Missing required fields (agent_type, title, content_markdown)' });
    }

    const supabase = clienteDelUsuario(req, res);
    if (!supabase) return;   // clienteDelUsuario ya respondió 401

    const { data, error } = await supabase
      .from('agent_reports')
      .insert({
        organization_id: organizationId,
        agent_type,
        title,
        summary: summary || title,
        content_markdown,
        metadata: metadata || {},
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, report: data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/agents/reports/:id/read
 * Marks a specific report as read.
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    const { id } = req.params;

    const supabase = clienteDelUsuario(req, res);
    if (!supabase) return;   // clienteDelUsuario ya respondió 401

    const { data, error } = await supabase
      .from('agent_reports')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Report marked as read' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/agents/reports/:id
 * Permanently deletes a report.
 */
router.delete('/:id', async (req, res) => {
  try {
    const organizationId = req.tenant?.id;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context missing' });
    }

    const reportId = req.params.id;
    const supabase = clienteDelUsuario(req, res);
    if (!supabase) return;   // clienteDelUsuario ya respondió 401

    const { error } = await supabase
      .from('agent_reports')
      .delete()
      .eq('id', reportId)
      .eq('organization_id', organizationId);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
