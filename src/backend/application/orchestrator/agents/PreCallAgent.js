// src/backend/application/orchestrator/agents/PreCallAgent.js

class PreCallAgent {
  constructor() {
    this.name = 'pre_call';
    this.description = 'Prepara resúmenes ejecutivos pre-reunión con contexto de cliente, oportunidades y riesgos.';
  }

  async execute(input, { provider, organizationId }) {
    const { clientName = 'Cliente', meetingTopic = 'Reunión Operativa', notes = '' } = input;

    const systemPrompt = `Eres el PreCall AI Agent de CoachData Operational OS v2.
Generas briefs de preparación para reuniones ejecutivas con enfoque en ventas, upsell y mitigación de riesgos.`;

    const userPrompt = `Prepara el brief para la reunión:
- Cliente: ${clientName}
- Tema: ${meetingTopic}
- Notas previas: ${notes || 'Sin notas adicionales'}

Genera las siguientes secciones en Markdown estructurado:
## Contexto del Cliente
## Oportunidades de Upsell
## Riesgos Potenciales
## Próximos Pasos Recomendados`;

    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.5 });
    return {
      agent: this.name,
      clientName,
      meetingTopic,
      briefMarkdown: result.text,
      provider: result.provider,
    };
  }
}

module.exports = PreCallAgent;
