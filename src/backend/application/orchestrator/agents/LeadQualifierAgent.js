// src/backend/application/orchestrator/agents/LeadQualifierAgent.js
'use strict';

const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');

class LeadQualifierAgent {
  constructor() {
    this.name = 'lead_qualifier';
    this.description = 'Califica un contacto/lead mediante IA según el criterio configurable del coach.';
  }

  async execute(input, context = {}) {
    const { provider, organizationId } = context;
    const { leadId } = input;

    if (!leadId) {
      throw new Error('[LeadQualifierAgent] leadId is required in input');
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('[LeadQualifierAgent] Supabase client not available');
    }

    // 1. Read lead scoring configuration
    const { data: config, error: configErr } = await supabase
      .from('lead_scoring_config')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (configErr) {
      throw new Error(`[LeadQualifierAgent] Failed to read config: ${configErr.message}`);
    }

    // If no config or inactive -> do NOT qualify
    if (!config || !config.activo) {
      const reason = !config
        ? 'No existe configuración de calificación (lead_scoring_config) para la organización.'
        : 'La calificación de leads (lead_scoring_config) está desactivada por el coach.';

      await supabase
        .from('crm_contacts')
        .update({
          score_reason: reason,
          scored_at: new Date().toISOString(),
          status: 'new' // remains in new status
        })
        .eq('id', leadId)
        .eq('organization_id', organizationId);

      return { skip: true, reason };
    }

    // 2. Fetch the contact's details
    // El leadId llega en el payload de un automation_job y no es de fiar por sí
    // solo: filtrar además por organización impide puntuar —o sobrescribir— el
    // contacto de otro tenant. El resto de consultas de este agente ya lo hacía.
    const { data: contact, error: contactErr } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single();

    if (contactErr || !contact) {
      throw new Error(`[LeadQualifierAgent] Lead not found: ${contactErr?.message || 'Empty result'}`);
    }

    const email = contact.email ? contact.email.toLowerCase().trim() : null;

    // 3. Fetch related canonical data
    let formEntries = [];
    let sessions = [];
    let payments = [];

    if (email) {
      // Form entries
      const { data: fe } = await supabase
        .from('canonical_form_entry')
        .select('form_name, respondent_name, answers, occurred_at')
        .eq('organization_id', organizationId)
        .eq('respondent_email', email);
      if (fe) formEntries = fe;

      // Sessions
      const { data: ss } = await supabase
        .from('canonical_session')
        .select('session_type, attendee_name, starts_at, raw_payload')
        .eq('organization_id', organizationId)
        .eq('attendee_email', email);
      if (ss) sessions = ss;

      // Payments
      const { data: pm } = await supabase
        .from('canonical_payment')
        .select('amount_cents, currency, status, occurred_at')
        .eq('organization_id', organizationId)
        .eq('payer_email', email);
      if (pm) payments = pm;
    }

    // 4. Construct prompts
    const systemPrompt = `Eres un calificador de leads experto para coaches de negocio. Tu tarea es analizar los datos de un lead y asignarle una puntuación (lead score) entre 0 y 100 basada en el criterio de calificación del coach y las señales proporcionadas.
Debes responder ÚNICAMENTE con un objeto JSON válido con el siguiente formato, sin explicaciones ni markdown adicionales (evita anteponer \`\`\`json o texto extra):
{
  "score": <un número entero de 0 a 100>,
  "reason": "<explicación estructurada y clara en español del motivo de la puntuación obtenida>"
}`;

    const userPrompt = `Criterio de Calificación del Coach:
"${config.criterio_texto || 'Sin criterio específico'}"

Señales y pesos configurados:
${JSON.stringify(config.senales, null, 2)}

Datos del lead a calificar:
- Nombre: ${contact.first_name || ''} ${contact.last_name || ''}
- Email: ${contact.email || 'N/A'}
- Origen (Source): ${contact.source || 'N/A'}

--- DATOS DE INTERACCIÓN HISTÓRICA ---
Formularios completados:
${JSON.stringify(formEntries, null, 2)}

Sesiones de Calendly agendadas:
${JSON.stringify(sessions, null, 2)}

Pagos realizados (Stripe):
${JSON.stringify(payments, null, 2)}
`;

    // 5. Call LLM
    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.2 });
    
    // Parse JSON safely
    let parsed;
    try {
      const cleanText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      console.error('[LeadQualifierAgent] Failed to parse JSON response from LLM. Raw output:', result.text);
      throw new Error(`LLM returned invalid JSON structure: ${parseErr.message}`);
    }

    const score = parseInt(parsed.score, 10);
    const reason = parsed.reason || 'Sin motivo reportado por el calificador.';

    if (isNaN(score) || score < 0 || score > 100) {
      throw new Error(`LLM returned invalid score number: ${parsed.score}`);
    }

    // 6. Map score to status based on config thresholds
    let status = 'unqualified';
    if (score >= config.umbral_alto) {
      status = 'qualified';
    } else if (score >= config.umbral_medio) {
      status = 'triage';
    }

    // 7. Update crm_contacts
    const { error: updateErr } = await supabase
      .from('crm_contacts')
      .update({
        lead_score: score,
        score_reason: reason,
        scored_at: new Date().toISOString(),
        status
      })
      .eq('id', leadId)
      .eq('organization_id', organizationId);

    if (updateErr) {
      throw new Error(`Failed to update crm_contacts with score: ${updateErr.message}`);
    }

    return {
      success: true,
      score,
      reason,
      status
    };
  }
}

module.exports = LeadQualifierAgent;
