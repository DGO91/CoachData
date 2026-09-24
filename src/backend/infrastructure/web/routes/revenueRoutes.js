// src/backend/infrastructure/web/routes/revenueRoutes.js
// CoachData Operational OS v2 — Native Revenue CRM & Operations routes
// No external Make.com requirements, 100% native Supabase CRM operations.

const express = require('express');
const router = express.Router();
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
const { dispatchNative } = require('../../../services/automation/AutomationDispatcher');

function getTenantId(req) {
  const tenantId = req.tenant?.id || req.user?.tenant_id;
  if (!tenantId) {
    throw new Error('Tenant context required');
  }
  return tenantId;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/revenue/leads (Fetch native contacts)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/leads', async (req, res) => {
  const tenantId = getTenantId(req);
  const supabase = dbDeUsuario(req, res);
  if (!supabase) return res.json({ leads: [] });

  const { data, error } = await supabase
    .from('crm_contacts')
    .select('*, company:crm_companies(*)')
    .eq('organization_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Deduplicate contacts by email within organization (A4)
  const mapByEmail = new Map();
  for (const c of (data || [])) {
    const key = c.email ? c.email.trim().toLowerCase() : c.id;
    if (!mapByEmail.has(key)) {
      mapByEmail.set(key, { ...c, mergedSources: [c.source || 'Directo'] });
    } else {
      const existing = mapByEmail.get(key);
      if (c.source && !existing.mergedSources.includes(c.source)) {
        existing.mergedSources.push(c.source);
      }
      if (typeof c.lead_score === 'number' && (existing.lead_score === null || c.lead_score > existing.lead_score)) {
        existing.lead_score = c.lead_score;
        existing.score_reason = c.score_reason;
        existing.scored_at = c.scored_at;
      }
      if (!existing.first_name && c.first_name) existing.first_name = c.first_name;
      if (!existing.last_name && c.last_name) existing.last_name = c.last_name;
    }
  }

  // Map database entity format to UI properties
  const mapped = Array.from(mapByEmail.values()).map(c => ({
    id: c.id,
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email || 'Contacto',
    email: c.email || '',
    company: c.company?.name || 'Independiente',
    source: (c.mergedSources || [c.source || 'Directo']).join(', '),
    score: typeof c.lead_score === 'number' ? c.lead_score : null,
    score_reason: c.score_reason || null,
    scored_at: c.scored_at || null,
    status: c.status || 'new'
  }));

  return res.json({ leads: mapped });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/revenue/lead-scoring-config
// ─────────────────────────────────────────────────────────────────────────────
router.get('/lead-scoring-config', async (req, res) => {
  const tenantId = getTenantId(req);
  const supabase = dbDeUsuario(req, res);
  if (!supabase) return;   // dbDeUsuario ya respondió 401

  try {
    const { data, error } = await supabase
      .from('lead_scoring_config')
      .select('*')
      .eq('organization_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    
    // Return existing config or a default template if not created yet
    return res.json(data || {
      organization_id: tenantId,
      criterio_texto: '',
      senales: {},
      umbral_alto: 70,
      umbral_medio: 40,
      activo: true
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/revenue/lead-scoring-config
// ─────────────────────────────────────────────────────────────────────────────
router.put('/lead-scoring-config', async (req, res) => {
  const tenantId = getTenantId(req);
  const supabase = dbDeUsuario(req, res);
  if (!supabase) return;   // dbDeUsuario ya respondió 401

  const { criterio_texto, senales, umbral_alto, umbral_medio, activo } = req.body || {};

  try {
    const { data, error } = await supabase
      .from('lead_scoring_config')
      .upsert({
        organization_id: tenantId,
        criterio_texto,
        senales: senales || {},
        umbral_alto: umbral_alto !== undefined ? umbral_alto : 70,
        umbral_medio: umbral_medio !== undefined ? umbral_medio : 40,
        activo: activo !== undefined ? activo : true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, config: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/revenue/leadhub-sync
// Trigger local CRM synchronization native job
// ─────────────────────────────────────────────────────────────────────────────
router.post('/leadhub-sync', async (req, res) => {
  const tenantId = getTenantId(req);
  const supabase = dbDeUsuario(req, res);

  try {
    const job = await dispatchNative(tenantId, 'leadhub_sync', req.body);
    return res.json({ success: true, jobId: job.jobId, details: job.details });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/revenue/chief-approve
// Approve triage draft and execute job locally
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chief-approve', async (req, res) => {
  const tenantId = getTenantId(req);
  const { lead, emailDraft } = req.body;

  try {
    const job = await dispatchNative(tenantId, 'lead_qualification', { leadId: lead.id });
    
    // Auto-create proposal draft as next stage pipeline activity
    await dispatchNative(tenantId, 'proposal_generation', {
      dealId: null,
      title: `Plan Estratégico: ${lead.company}`,
      amount: '€4,500'
    });

    return res.json({ success: true, jobId: job.jobId, details: job.details });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/revenue/call-approve
// Qualify call recording natively
// ─────────────────────────────────────────────────────────────────────────────
router.post('/call-approve', async (req, res) => {
  return res.status(501).json({ error: 'Not Implemented', message: 'Call Intelligence is currently disabled.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/call-intelligence/upload
// Native file upload trigger
// ─────────────────────────────────────────────────────────────────────────────
router.post('/call-intelligence/upload', async (req, res) => {
  return res.status(501).json({ error: 'Not Implemented', message: 'Call Intelligence is currently disabled.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/revenue/prospect
// Create a new prospect/lead natively bypassing frontend RLS sync issues
// ─────────────────────────────────────────────────────────────────────────────
const { authMiddleware } = require('../middlewares/authMiddleware');
const tenantContextMiddleware = require('../middlewares/tenantContextMiddleware');

router.post('/prospect', authMiddleware, tenantContextMiddleware, async (req, res) => {
  const tenantId = getTenantId(req);
  const { companyName, firstName, lastName, email, source, leadScore } = req.body;
  const supabase = dbDeUsuario(req, res);
  
  console.group('[PROSPECT API]');
  console.log('User:', req.user?.id);
  console.log('Email:', req.user?.email);
  console.log('Tenant:', req.tenant);
  console.log('Body:', req.body);
  console.groupEnd();

  if (!supabase) return;   // dbDeUsuario ya respondió 401

  try {
    let companyId = null;
    if (companyName) {
      // Intentar buscar la empresa primero o crearla
      let { data: comp } = await supabase.from('crm_companies')
        .select('id').eq('name', companyName).eq('organization_id', tenantId).maybeSingle();
        
      if (!comp) {
        const { data: newComp, error: compErr } = await supabase.from('crm_companies').insert({
          organization_id: tenantId,
          name: companyName
        }).select().single();
        if (compErr && compErr.code !== '23505') throw compErr;
        comp = newComp || (await supabase.from('crm_companies').select('id').eq('name', companyName).eq('organization_id', tenantId).maybeSingle());
      }
      companyId = comp?.id;
    }
    
    const { data: contact, error: contactErr } = await supabase.from('crm_contacts').insert({
      organization_id: tenantId,
      company_id: companyId,
      first_name: firstName,
      last_name: lastName || null,
      email,
      source,
      lead_score: leadScore,
      status: 'new'
    }).select().single();
    
    if (contactErr) throw contactErr;
    
    return res.status(201).json({
      success: true,
      lead: {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
        email: contact.email || '',
        company: companyName || 'Independiente',
        source: contact.source || 'Directo',
        score: contact.lead_score || 0,
        status: contact.status || 'new'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/revenue/proposal-approve
// Run proposal provisioning + stripe invoicing locally
// ─────────────────────────────────────────────────────────────────────────────
router.post('/proposal-approve', async (req, res) => {
  const tenantId = getTenantId(req);
  const { client, proposal } = req.body;

  try {
    // 1. Generate Stripe Invoice Draft
    const stripeJob = await dispatchNative(tenantId, 'stripe_invoice_draft', {
      proposalId: proposal?.id || 'proposal-id',
      client,
      amount: proposal?.amount || '4500'
    });

    // 2. Generate Contract
    await dispatchNative(tenantId, 'contract_generation', {
      proposalId: proposal?.id || 'proposal-id'
    });

    // 3. Provision client workspace
    const provisionJob = await dispatchNative(tenantId, 'client_workspace_provision', {
      client,
      proposalId: proposal?.id || 'proposal-id'
    });

    return res.json({
      success: true,
      message: 'Propuesta y entregables procesados nativamente.',
      stripeDetails: stripeJob.details,
      provisioning: provisionJob.details
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/revenue/clients/timeline
// Consolidated canonical timeline for a client
// ─────────────────────────────────────────────────────────────────────────────
router.get('/clients/timeline', async (req, res) => {
  const tenantId = getTenantId(req);
  const supabase = dbDeUsuario(req, res);
  if (!supabase) return;   // dbDeUsuario ya respondió 401

  const { email, contact_id } = req.query;
  let targetEmail = typeof email === 'string' ? email.trim().toLowerCase() : null;

  try {
    let contactInfo = null;

    if (contact_id) {
      const { data: contact, error: cErr } = await supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, lead_score, score_reason, scored_at, status, company:crm_companies(name)')
        .eq('organization_id', tenantId)
        .eq('id', contact_id)
        .maybeSingle();

      if (cErr) throw cErr;
      if (contact) {
        contactInfo = contact;
        if (!targetEmail && contact.email) {
          targetEmail = contact.email.trim().toLowerCase();
        }
      }
    } else if (targetEmail) {
      const { data: contact, error: cErr } = await supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, email, lead_score, score_reason, scored_at, status, company:crm_companies(name)')
        .eq('organization_id', tenantId)
        .eq('email', targetEmail)
        .maybeSingle();

      if (cErr) throw cErr;
      if (contact) {
        contactInfo = contact;
      }
    }

    if (!targetEmail) {
      return res.status(400).json({ error: 'Parámetro email o contact_id requerido.' });
    }

    // Fetch canonical events in parallel filtered strictly by organization_id and email
    const [formsRes, sessionsRes, paymentsRes] = await Promise.all([
      supabase
        .from('canonical_form_entry')
        .select('id, source_provider, source_id, form_name, respondent_email, respondent_name, answers, occurred_at, ingested_at')
        .eq('organization_id', tenantId)
        .eq('respondent_email', targetEmail),
      supabase
        .from('canonical_session')
        .select('id, source_provider, source_id, starts_at, ends_at, attendee_email, attendee_name, session_type, raw_payload, occurred_at, ingested_at')
        .eq('organization_id', tenantId)
        .eq('attendee_email', targetEmail),
      supabase
        .from('canonical_payment')
        .select('id, source_provider, source_id, amount_cents, currency, status, payer_email, payer_name, occurred_at, ingested_at')
        .eq('organization_id', tenantId)
        .eq('payer_email', targetEmail)
    ]);

    if (formsRes.error) throw formsRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;

    const timeline = [];

    // Map Form Entries
    (formsRes.data || []).forEach(f => {
      timeline.push({
        id: f.id,
        type: 'form_entry',
        source_provider: f.source_provider,
        title: `Formulario completado: ${f.form_name || 'Sin título'}`,
        occurred_at: f.occurred_at || f.ingested_at,
        details: {
          form_name: f.form_name,
          answers: f.answers || {}
        }
      });
    });

    // Map Sessions
    (sessionsRes.data || []).forEach(s => {
      const isCanceled = s.raw_payload?._canceled === true;
      timeline.push({
        id: s.id,
        type: 'session',
        source_provider: s.source_provider,
        title: `Sesión ${isCanceled ? 'cancelada' : 'agendada'}: ${s.session_type || 'Sesión'}`,
        occurred_at: s.starts_at || s.occurred_at || s.ingested_at,
        details: {
          session_type: s.session_type,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          status: isCanceled ? 'canceled' : 'scheduled'
        }
      });
    });

    // Map Payments
    (paymentsRes.data || []).forEach(p => {
      const formattedAmount = (p.amount_cents / 100).toFixed(2);
      timeline.push({
        id: p.id,
        type: 'payment',
        source_provider: p.source_provider,
        title: `Pago procesado: ${formattedAmount} ${p.currency?.toUpperCase() || 'EUR'} (${p.status})`,
        occurred_at: p.occurred_at || p.ingested_at,
        details: {
          amount_cents: p.amount_cents,
          currency: p.currency,
          status: p.status
        }
      });
    });

    // Sort timeline descending by occurred_at
    timeline.sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

    return res.json({
      success: true,
      contact: contactInfo ? {
        id: contactInfo.id,
        name: `${contactInfo.first_name || ''} ${contactInfo.last_name || ''}`.trim() || targetEmail,
        email: contactInfo.email,
        company: contactInfo.company?.name || 'Independiente',
        score: contactInfo.lead_score || 0,
        score_reason: contactInfo.score_reason || null,
        scored_at: contactInfo.scored_at || null,
        status: contactInfo.status || 'new'
      } : {
        id: null,
        name: targetEmail,
        email: targetEmail,
        company: 'Independiente',
        score: 0,
        score_reason: null,
        scored_at: null,
        status: 'new'
      },
      timeline
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

