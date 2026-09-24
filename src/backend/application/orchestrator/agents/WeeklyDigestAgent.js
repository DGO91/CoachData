// src/backend/application/orchestrator/agents/WeeklyDigestAgent.js

class WeeklyDigestAgent {
  constructor() {
    this.name = 'weekly_digest';
    this.description = 'Genera un resumen semanal consolidado en Markdown para la organización.';
  }

  async execute(input, { provider, organizationId }) {
    const { completedTasksCount = 0, activeUsersCount = 0, metrics = {} } = input;

    const systemPrompt = `Eres el Weekly Digest AI Agent de CoachData OS v2.
Tu labor es consolidar los avances semanales de la organización en un informe ejecutivo elegante y conciso.`;

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

    const userPrompt = `Genera el resumen semanal para la Organización ${organizationId}:
- Tareas completadas: ${completedTasksCount}
- Usuarios activos: ${activeUsersCount}
- Métricas clave: ${JSON.stringify(metrics)}

${canonicalSummary}

Incluye:
1. Resumen Ejecutivo de Avance
2. Hitos Alcanzados
3. Cuellos de Botella / Tareas Bloqueadas
4. Plan de Acción para la Próxima Semana`;

    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.3 });
    return {
      agent: this.name,
      digestMarkdown: result.text,
      provider: result.provider,
    };
  }
}

module.exports = WeeklyDigestAgent;
