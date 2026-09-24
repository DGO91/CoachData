'use strict';

const { SupabaseCanonicalRepository } = require('../infrastructure/repositories/SupabaseCanonicalRepository');

/**
 * CanonicalAgentContext — MCP / Agent Context Facade.
 *
 * Provides a unified context bundle for AI Orchestrator agents (EveningSummary,
 * PreCall, WeeklyDigest, LeadQualifier) reading directly from the 4 canonical entity tables.
 */
class CanonicalAgentContext {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
   */
  constructor(supabaseClient) {
    if (!supabaseClient) throw new Error('CanonicalAgentContext requires a supabaseClient');
    this._repo = new SupabaseCanonicalRepository(supabaseClient);
  }

  /**
   * Fetch complete unified context for an organization.
   *
   * @param {string} organizationId
   * @param {object} [options]
   * @param {number} [options.limit=10]
   * @returns {Promise<{ contacts: object[], payments: object[], sessions: object[], formEntries: object[] }>}
   */
  async getUnifiedContext(organizationId, { limit = 10 } = {}) {
    if (!organizationId) return { contacts: [], payments: [], sessions: [], formEntries: [] };

    const [contacts, payments, sessions, formEntries] = await Promise.all([
      this._repo.findByOrg('contact', organizationId, { limit }),
      this._repo.findByOrg('payment', organizationId, { limit }),
      this._repo.findByOrg('session', organizationId, { limit }),
      this._repo.findByOrg('form_entry', organizationId, { limit }),
    ]);

    return {
      contacts,
      payments,
      sessions,
      formEntries,
    };
  }

  /**
   * Format the unified context into a clean markdown prompt summary for LLM agents.
   *
   * @param {string} organizationId
   * @returns {Promise<string>}
   */
  async getPromptSummary(organizationId) {
    const ctx = await this.getUnifiedContext(organizationId, { limit: 5 });

    let summary = `### DATOS CANÓNICOS EN TIEMPO REAL (ORGANIZACIÓN: ${organizationId})\n\n`;

    summary += `#### Pagos Recientes (${ctx.payments.length}):\n`;
    if (ctx.payments.length === 0) {
      summary += `- Ningún pago registrado aún.\n`;
    } else {
      ctx.payments.forEach(p => {
        summary += `- [${p.source_provider}] ${p.payer_name || p.payer_email || 'Pago'}: ${(p.amount_cents / 100).toFixed(2)} ${p.currency} (${p.status})\n`;
      });
    }

    summary += `\n#### Formularios Completados (${ctx.formEntries.length}):\n`;
    if (ctx.formEntries.length === 0) {
      summary += `- Ningún formulario completado aún.\n`;
    } else {
      ctx.formEntries.forEach(f => {
        summary += `- [${f.source_provider}] ${f.form_name || 'Formulario'} por ${f.respondent_name || f.respondent_email || 'Anónimo'}\n`;
      });
    }

    summary += `\n#### Sesiones Agendadas (${ctx.sessions.length}):\n`;
    if (ctx.sessions.length === 0) {
      summary += `- Ninguna sesión agendada aún.\n`;
    } else {
      ctx.sessions.forEach(s => {
        summary += `- [${s.source_provider}] ${s.session_type || 'Sesión'} con ${s.attendee_name || s.attendee_email || 'Invitado'} (${s.starts_at || 'Sin fecha'})\n`;
      });
    }

    return summary;
  }
}

module.exports = { CanonicalAgentContext };
