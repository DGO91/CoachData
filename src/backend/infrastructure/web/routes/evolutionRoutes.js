/**
 * evolutionRoutes.js
 * Evolution WhatsApp Integration Router (Public UI endpoints — protected by authMiddleware & tenantContextMiddleware)
 * CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const evolutionService = require('../../services/evolutionService');

function getTenantId(req) {
  const tenantId = req.tenant?.id || req.body?.tenantId || req.query?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return tenantId;
}

// POST /api/evolution/connect
router.post('/connect', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const instanceData = await evolutionService.createInstance(tenantId);
    res.json(instanceData);
  } catch (error) {
    console.error('[Evolution API Router] Connect Error:', error.message);
    res.status(401).json({ error: error.message || 'Tenant context required' });
  }
});

// GET /api/evolution/status
router.get('/status', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
    const stateData = await evolutionService.getConnectionState(instanceName);
    res.json(stateData);
  } catch (error) {
    console.error('[Evolution API Router] Status Error:', error.message);
    res.status(401).json({ error: error.message || 'Tenant context required' });
  }
});

// DELETE /api/evolution/disconnect
router.delete('/disconnect', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
    await evolutionService.logoutInstance(instanceName);
    res.json({ message: 'Disconnected and deleted successfully' });
  } catch (error) {
    console.error('[Evolution API Router] Disconnect Error:', error.message);
    res.status(401).json({ error: error.message || 'Tenant context required' });
  }
});

// POST /api/evolution/send (UI send endpoint for authenticated human users)
router.post('/send', async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.body?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required' });
    }

    const { message, number } = req.body;
    let targetNumber = number;

    if (!targetNumber) {
      try {
        const credentialsUseCase = require('../../../application/credentials/credentialsUseCase');
        const creds = await credentialsUseCase.getDecryptedTenantKeys(tenantId);
        targetNumber = creds.keys && creds.keys.whatsapp_number;
      } catch (err) {
        console.error('Failed to lookup tenant whatsapp_number:', err.message);
      }
    }

    if (targetNumber) {
      targetNumber = targetNumber.toString().replace(/\D/g, '');
    }

    if (!targetNumber) {
      return res.status(400).json({ error: 'target number is required to send message' });
    }

    const instanceName = `tenant_${tenantId.replace(/-/g, '')}`;
    const axios = require('axios');
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    if (!baseUrl || !apiKey) {
      return res.status(500).json({ error: 'Evolution API environment variables not configured' });
    }

    const url = `${baseUrl}/message/sendText/${instanceName}`;
    await axios.post(url, {
      number: targetNumber,
      options: { delay: 1200, presence: 'composing' },
      text: message
    }, {
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' }
    });
    
    res.json({ success: true, message: 'Sent via Evolution API Tenant Instance' });
  } catch (error) {
    console.error('[Evolution API Router] Send Error:', error.message);
    res.status(500).json({ error: error.message || 'Error sending message via Evolution API' });
  }
});

module.exports = router;
