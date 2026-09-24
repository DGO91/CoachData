/**
 * googleAgentRoutes.js
 * Tenant-Isolated Google Agents API Routes — CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { 
  getUnreadEmails, 
  getTodayCalendarEvents, 
  getWeeklyCalendarSummary,
  sendEmailReply 
} = require('../../services/googleIntegrationService');
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
const { getDecryptedTenantKeys } = require('../../../application/credentials/credentialsUseCase');

function getTenantId(req) {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return tenantId;
}

/**
 * GET /morning-briefing/live
 */
router.get('/morning-briefing/live', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const events = await getTodayCalendarEvents(tenantId);
    const emails = await getUnreadEmails(tenantId, 5);

    if (events === null && emails === null) {
      return res.json({
        connected: false,
        message: 'Google Account not connected'
      });
    }

    res.json({
      connected: true,
      events: events || [],
      unreadEmails: emails || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[GoogleAgentRoutes] Error fetching morning briefing:', err);
    res.status(500).json({ error: err.message });
  }
});

// Legacy route compatibility deriving tenantId safely from req.tenant.id
router.get('/morning-briefing/live/:tenantId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const events = await getTodayCalendarEvents(tenantId);
    const emails = await getUnreadEmails(tenantId, 5);

    if (events === null && emails === null) {
      return res.json({ connected: false, message: 'Google Account not connected' });
    }

    res.json({
      connected: true,
      events: events || [],
      unreadEmails: emails || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /morning-briefing/test-whatsapp
 */
router.post('/morning-briefing/test-whatsapp', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    const supabase = dbDeUsuario(req, res);
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data: profile } = await supabase.from('profiles').select('name').eq('id', tenantId).maybeSingle();
    const userName = profile?.name || 'Ejecutivo';

    const creds = await getDecryptedTenantKeys(tenantId);
    
    const phone = creds?.keys?.whatsapp_number || process.env.WHATSAPP_PHONE;
    const apiKey = creds?.keys?.whatsapp_api_key || process.env.WHATSAPP_API_KEY;
      
    if (!phone || !apiKey) {
      return res.status(400).json({ success: false, error: 'Credenciales de WhatsApp no configuradas en el sistema.' });
    }

    const events = await getTodayCalendarEvents(tenantId) || [];
    const emails = await getUnreadEmails(tenantId, 5) || [];

    let message = `Good morning ${userName}! ☀️\n\n`;
    message += `📅 On your agenda for today:\n`;
    if (events.length > 0) {
      events.forEach(e => { message += `- ${e.time} ${e.name}\n`; });
    } else {
      message += `- No events scheduled for today 🎉\n`;
    }
    
    message += `\n📧 Emails to get back to:\n`;
    if (emails.length > 0) {
      emails.forEach(e => {
        const sender = e.from.split('<')[0].replace(/"/g, '').trim();
        message += `- ${sender}: ${e.subject}\n`;
      });
    } else {
      message += `- No urgent emails today! ✅\n`;
    }

    try {
      await axios.post('http://localhost:4000/api/evolution/send', {
        number: phone,
        message: message,
        tenantId: tenantId
      });
      return res.json({ success: true, message: 'Reporte enviado a WhatsApp vía Evolution API' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Evolution API error: ' + (err.response?.data?.error || err.message) });
    }
  } catch (err) {
    console.error('[GoogleAgentRoutes] Error testing WhatsApp briefing:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/morning-briefing/test-whatsapp/:tenantId', async (req, res) => {
  return res.redirect(307, '/api/google-agents/morning-briefing/test-whatsapp');
});

/**
 * GET /evening-summary/live
 */
router.get('/evening-summary/live', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const events = await getTodayCalendarEvents(tenantId);
    const emails = await getUnreadEmails(tenantId, 10);

    if (events === null && emails === null) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      completedMeetingsCount: events ? events.length : 0,
      processedEmailsCount: emails ? emails.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/evening-summary/live/:tenantId', async (req, res) => {
  return res.redirect('/api/google-agents/evening-summary/live');
});

/**
 * GET /weekly-digest/live
 */
router.get('/weekly-digest/live', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const weeklyData = await getWeeklyCalendarSummary(tenantId);

    if (!weeklyData) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      ...weeklyData,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/weekly-digest/live/:tenantId', async (req, res) => {
  return res.redirect('/api/google-agents/weekly-digest/live');
});

/**
 * GET /mail-responder/live
 */
router.get('/mail-responder/live', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const emails = await getUnreadEmails(tenantId, 8);

    if (!emails) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      threads: emails,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mail-responder/live/:tenantId', async (req, res) => {
  return res.redirect('/api/google-agents/mail-responder/live');
});

/**
 * POST /mail-responder/reply
 */
router.post('/mail-responder/reply', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { threadId, to, subject, body } = req.body;
    if (!threadId || !to || !body) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await sendEmailReply(tenantId, threadId, to, subject || '', body);
    res.json({ success: true, result });
  } catch (err) {
    console.error('[GoogleAgentRoutes] Error sending email reply:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
