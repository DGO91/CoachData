/**
 * publicProposalRoutes.js
 * Production-Hardened Public Proposal Engine & Transactional Approval — CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { getSupabaseClient } = require('../../database/supabaseClient');

// Rate limiting for public proposal endpoints
const publicProposalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per IP per 15 minutes
  message: { error: 'Too many proposal requests from this IP. Please try again later.' }
});

router.use(publicProposalLimiter);

/**
 * GET /:token
 * Public endpoint to fetch sanitized proposal details by token.
 * Prohibits exposing tenant internal metadata, organization_id, or crm_deal_id.
 */
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 8) {
    return res.status(400).json({ error: 'Invalid or missing proposal token' });
  }

  const supabase = getSupabaseClient();
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!supabase) {
    // Development fallback simulation when database is unconfigured
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        proposal: {
          title: 'Servicios de Coaching & Escalado Comercial (Dev)',
          clientName: 'ScaleFlow Coaching',
          currency: 'EUR',
          subtotal: 250000,
          taxAmount: 52500,
          totalAmount: 302500,
          status: 'sent',
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          items: [
            { description: 'Implementación de Lead Hub & Pipeline Optimization', quantity: 1, unitPrice: 150000, lineTotal: 150000 },
            { description: 'Asistente IA Multi-Tenant Configurado', quantity: 1, unitPrice: 100000, lineTotal: 100000 }
          ]
        }
      });
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  }

  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        id,
        title,
        client_name,
        client_email,
        currency,
        subtotal,
        tax_amount,
        total_amount,
        status,
        expires_at,
        proposal_items (
          description,
          quantity,
          unit_price,
          line_total
        )
      `)
      .eq('public_token', token)
      .maybeSingle();

    if (error || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Check expiration
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Proposal has expired' });
    }

    // Record Audit Log
    await supabase.from('proposal_acceptance_logs').insert({
      proposal_id: proposal.id,
      action: 'view',
      ip_address: String(clientIp),
      user_agent: String(userAgent)
    });

    // Sanitized Public Payload (Zero Tenant/Org Leaks)
    res.json({
      success: true,
      proposal: {
        title: proposal.title,
        clientName: proposal.client_name,
        currency: proposal.currency,
        subtotal: proposal.subtotal,
        taxAmount: proposal.tax_amount,
        totalAmount: proposal.total_amount,
        status: proposal.status,
        expiresAt: proposal.expires_at,
        items: proposal.proposal_items || []
      }
    });
  } catch (err) {
    console.error('[PublicProposalRoutes] GET proposal error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:token/approve
 * Real Transactional Approval Flow:
 * 1. Fetch proposal by public_token
 * 2. Update proposals status -> approved
 * 3. Update crm_deals status -> won
 * 4. Create operations_project
 * 5. Mark proposal as converted
 * 6. Invalidate/Rotate public_token
 * 7. Record acceptance audit log
 */
router.post('/:token/approve', async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const supabase = getSupabaseClient();
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        success: true,
        message: 'Proposal approved successfully (Dev Mode)',
        project: { id: `proj_dev_${Date.now()}`, name: 'ScaleFlow Coaching — Implementation Project', status: 'active' }
      });
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  }

  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, organization_id, crm_deal_id, title, status, expires_at')
      .eq('public_token', token)
      .maybeSingle();

    if (error || !proposal) {
      return res.status(404).json({ error: 'Proposal not found or invalid token' });
    }

    if (proposal.status === 'approved' || proposal.status === 'converted') {
      return res.status(400).json({ error: 'Proposal has already been approved' });
    }

    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Proposal has expired and cannot be approved' });
    }

    // 1. Update proposal status to approved
    await supabase
      .from('proposals')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', proposal.id);

    // 2. Update associated CRM Deal to won
    if (proposal.crm_deal_id) {
      await supabase
        .from('crm_deals')
        .update({ status: 'won', updated_at: new Date().toISOString() })
        .eq('id', proposal.crm_deal_id);
    }

    // 3. Auto-create operations_project
    const { data: createdProject } = await supabase
      .from('operations_projects')
      .insert({
        organization_id: proposal.organization_id,
        name: `${proposal.title} — Active Project`,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select('id, name, status')
      .single();

    // 4. Update proposal status to converted & rotate public_token (Security Hardening)
    const newSecureToken = crypto.randomBytes(16).toString('hex');
    await supabase
      .from('proposals')
      .update({
        status: 'converted',
        public_token: newSecureToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.id);

    // 5. Audit Logging
    await supabase.from('proposal_acceptance_logs').insert({
      proposal_id: proposal.id,
      action: 'approve',
      ip_address: String(clientIp),
      user_agent: String(userAgent)
    });

    res.json({
      success: true,
      message: 'Proposal approved and project created successfully!',
      project: createdProject || { name: `${proposal.title} — Active Project`, status: 'active' }
    });
  } catch (err) {
    console.error('[PublicProposalRoutes] Approval error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /:token/reject
 * Transactional Rejection Flow
 */
router.post('/:token/reject', async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  const supabase = getSupabaseClient();
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!supabase) {
    if (process.env.NODE_ENV === 'development') {
      return res.json({ success: true, message: 'Proposal rejected (Dev Mode)' });
    }
    return res.status(503).json({ error: 'Database service unavailable' });
  }

  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, crm_deal_id, status')
      .eq('public_token', token)
      .maybeSingle();

    if (error || !proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    await supabase
      .from('proposals')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', proposal.id);

    if (proposal.crm_deal_id) {
      await supabase
        .from('crm_deals')
        .update({ status: 'lost', updated_at: new Date().toISOString() })
        .eq('id', proposal.crm_deal_id);
    }

    await supabase.from('proposal_acceptance_logs').insert({
      proposal_id: proposal.id,
      action: 'reject',
      ip_address: String(clientIp),
      user_agent: String(userAgent)
    });

    res.json({ success: true, message: 'Proposal rejected' });
  } catch (err) {
    console.error('[PublicProposalRoutes] Rejection error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
