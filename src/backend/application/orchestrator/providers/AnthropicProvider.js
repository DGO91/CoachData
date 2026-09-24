// src/backend/application/orchestrator/providers/AnthropicProvider.js

// El ID vive en un único sitio compartido con los agentes. Ver el porqué en
// src/backend/shared/anthropicModel.js.
const { MODELO_ANTHROPIC } = require('../../../shared/anthropicModel');

class AnthropicProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.defaultModel = MODELO_ANTHROPIC;
  }

  // `temperature` se acepta por compatibilidad con la firma común de los
  // proveedores, pero NO se envía: los modelos Claude 5 rechazan con 400
  // cualquier valor de temperature/top_p/top_k distinto del predeterminado.
  // El comportamiento se dirige con el prompt.
  async generate({ systemPrompt, userPrompt, maxTokens = 4096, model }) {
    const selectedModel = model || this.defaultModel;

    if (!this.apiKey) {
      // Sin clave no hay respuesta posible. Fallar aquí, y no devolver texto
      // inventado, es lo que impide que una salida falsa se presente como IA.
      throw new Error(
        '[AnthropicProvider] ANTHROPIC_API_KEY no está configurada: no se puede generar nada.'
      );
    }

    try {
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: this.apiKey });

      const response = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: maxTokens,
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: userPrompt }],
      });

      if (response.stop_reason === 'refusal') {
        throw new Error(
          `[AnthropicProvider] El modelo rechazó la petición (${response.stop_details?.category || 'sin categoría'}).`
        );
      }

      const text = response.content.find((b) => b.type === 'text')?.text || '';
      return {
        text,
        provider: 'anthropic',
        model: response.model || selectedModel,
        tokensUsed: response.usage || null,
      };
    } catch (err) {
      console.error('[AnthropicProvider] Error ejecutando llamada a Anthropic:', err.message);
      throw err;
    }
  }
}

module.exports = AnthropicProvider;
