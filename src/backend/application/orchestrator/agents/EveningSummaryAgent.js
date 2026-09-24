// src/backend/application/orchestrator/agents/EveningSummaryAgent.js

class EveningSummaryAgent {
  constructor() {
    this.name = 'evening_summary';
    this.description = 'Genera resúmenes diarios automáticos al cierre de jornada.';
  }

  async execute(input, { provider, organizationId }) {
    const { openTasks = 0, overdueTasks = 0, recentActivityCount = 0 } = input;

    const systemPrompt = `Eres el Evening Summary Agent de CoachData OS v2.
Generas un cierre diario conciso para mantener la claridad operativa de la organización.`;

    let canonicalSummary = '';
    try {
      const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');
      const db = supabaseClient || getSupabaseClient();
      if (db && organizationId) {
        const { CanonicalAgentContext } = require('../../../modules/integrations/application/CanonicalAgentContext');
        const facade = new CanonicalAgentContext(db);
        canonicalSummary = await facade.getPromptSummary(organizationId);
      }
    } catch (e) {}

    const userPrompt = `Genera el resumen diario:
- Tareas Abiertas: ${openTasks}
- Tareas Vencidas: ${overdueTasks}
- Actividades Registradas Hoy: ${recentActivityCount}

${canonicalSummary}

Proporciona un reporte rápido en Markdown de 3 párrafos con alertas y recomendaciones de cierre.`;

    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.4 });
    return {
      agent: this.name,
      summaryMarkdown: result.text,
      provider: result.provider,
    };
  }
}

module.exports = EveningSummaryAgent;
