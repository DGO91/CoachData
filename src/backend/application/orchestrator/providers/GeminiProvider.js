// src/backend/application/orchestrator/providers/GeminiProvider.js

class GeminiProvider {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.defaultModel = 'gemini-1.5-flash';
  }

  async generate({ systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1000, model }) {
    const selectedModel = model || this.defaultModel;

    if (!this.apiKey) {
      return {
        text: `[Google Gemini Response Mock (${selectedModel})]\n\nRespuesta generada para: "${userPrompt.substring(0, 80)}..."\n\n- Análisis rápido completado.`,
        provider: 'gemini',
        model: selectedModel,
        tokensUsed: { prompt: 130, completion: 60, total: 190 },
      };
    }

    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const geminiModel = genAI.getGenerativeModel({ model: selectedModel });

      const fullPrompt = systemPrompt ? `System: ${systemPrompt}\n\nUser: ${userPrompt}` : userPrompt;
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        text,
        provider: 'gemini',
        model: selectedModel,
        tokensUsed: null,
      };
    } catch (err) {
      console.error('[GeminiProvider] Error ejecutando llamada a Gemini:', err.message);
      throw err;
    }
  }
}

module.exports = GeminiProvider;
