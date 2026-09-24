// src/backend/application/orchestrator/providers/OpenAIProvider.js

class OpenAIProvider {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.defaultModel = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
  }

  async generate({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000, model }) {
    const selectedModel = model || this.defaultModel;

    if (!this.apiKey) {
      // Mock / Fallback inteligente si no hay API key configurada en dev
      return {
        text: `[OpenAI Response Mock (${selectedModel})]\n\nAnálisis completado para: "${userPrompt.substring(0, 80)}..."\n\n- Puntos clave identificados.\n- Recomendación operativa lista.`,
        provider: 'openai',
        model: selectedModel,
        tokensUsed: { prompt: 150, completion: 80, total: 230 },
      };
    }

    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: this.apiKey });

      const response = await openai.chat.completions.create({
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content || '';
      return {
        text,
        provider: 'openai',
        model: selectedModel,
        tokensUsed: response.usage || null,
      };
    } catch (err) {
      console.error('[OpenAIProvider] Error ejecutando llamada a OpenAI:', err.message);
      throw err;
    }
  }
}

module.exports = OpenAIProvider;
