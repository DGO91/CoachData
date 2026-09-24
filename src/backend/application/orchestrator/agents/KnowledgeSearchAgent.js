// src/backend/application/orchestrator/agents/KnowledgeSearchAgent.js

class KnowledgeSearchAgent {
  constructor() {
    this.name = 'knowledge_search';
    this.description = 'Preparado para RAG y búsqueda semántica avanzada sobre documentación organizacional.';
  }

  async execute(input, { provider, organizationId }) {
    const { query = '', limit = 5 } = input;

    const systemPrompt = `Eres el Knowledge Search AI Agent de CoachData OS v2 (RAG System).
Recuperas información relevante y respuestas precisas sobre los procesos y base de conocimiento de la organización.`;

    const userPrompt = `Consulta del usuario: "${query}"

Simula la búsqueda semántica e indica:
1. Respuesta sintetizada a la consulta.
2. Fuentes sugeridas (Documentos / KIs).
3. Nivel de confianza.`;

    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.2 });
    return {
      agent: this.name,
      query,
      searchMarkdown: result.text,
      provider: result.provider,
    };
  }
}

module.exports = KnowledgeSearchAgent;
