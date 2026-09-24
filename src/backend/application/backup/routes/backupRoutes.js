// src/backend/application/backup/routes/backupRoutes.js
const express = require('express');
const router = express.Router();
const ExportService = require('../ExportService');
const RestoreService = require('../RestoreService');
const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');

/**
 * Backup & Recovery Express Routes (Phase 7.5)
 * Protected for Owner / Admin roles only.
 */

// Este router estaba sin montar en app.js, y con razón. Su guardián se llamaba
// enforceAdminRole y no comprobaba ningún rol: le bastaba que existiera una
// cabecera Authorization —sin validarla— y tomaba la organización de
// `x-tenant-id`, una cabecera que envía el cliente, con el UUID fijo
// 0000...0001 como valor por defecto. Cualquiera podía exportar los datos de
// cualquier organización, y escribir en ella a través de /restore.
//
// Ahora la autenticación y el rol los imponen aguas arriba, en app.js:
// authMiddleware valida el JWT contra Supabase, tenantContextMiddleware resuelve
// la organización comprobando la membresía real, y requireOwnerRole exige ser
// propietario. Aquí sólo se traduce ese contexto ya verificado.
function enforceAdminRole(req, res, next) {
  const organizationId = req.tenant?.id;
  if (!organizationId) {
    return res.status(403).json({ error: 'Forbidden', message: 'No hay contexto de organización' });
  }
  // Los servicios de este módulo esperan `req.tenantId`; se rellena desde el
  // contexto verificado en vez de desde una cabecera del cliente.
  req.tenantId = organizationId;
  next();
}

// GET /api/backup/export/full (JSON)
router.get('/export/full', enforceAdminRole, async (req, res) => {
  try {
    const data = await ExportService.exportFullOrganization(req.tenantId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=coachdata_export_${req.tenantId}_${Date.now()}.json`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/export/tasks (CSV)
router.get('/export/tasks', enforceAdminRole, async (req, res) => {
  try {
    const csv = await ExportService.exportTasksToCSV(req.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=tasks_${req.tenantId}_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/export/content (CSV)
router.get('/export/content', enforceAdminRole, async (req, res) => {
  try {
    const csv = await ExportService.exportContentToCSV(req.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=content_${req.tenantId}_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/restore
router.post('/restore', enforceAdminRole, async (req, res) => {
  try {
    const backupData = req.body;
    const result = await RestoreService.restoreFullOrganization(req.tenantId, backupData);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
