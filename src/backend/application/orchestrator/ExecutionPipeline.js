// src/backend/application/orchestrator/ExecutionPipeline.js
const agentRegistry = require('./AgentRegistry');
const OpenAIProvider = require('./providers/OpenAIProvider');
const AnthropicProvider = require('./providers/AnthropicProvider');
const GeminiProvider = require('./providers/GeminiProvider');

class ExecutionPipeline {
  constructor() {
    this.providers = {
      openai: new OpenAIProvider(),
      anthropic: new AnthropicProvider(),
      gemini: new GeminiProvider(),
    };
    this.defaultProvider = process.env.AI_DEFAULT_PROVIDER || 'openai';
  }

  /**
   * Ejecuta un agente seleccionado registrando métricas y auditable en ai_agent_logs.
   */
  async execute({ organizationId, agentName, input = {}, provider: requestedProvider, supabaseClient }) {
    const startTime = Date.now();

    // Sin organización no se ejecuta: este parámetro tenía un UUID fijo por
    // defecto, así que cualquier llamada que olvidara pasarlo corría bajo una
    // identidad ajena y escribía su rastro en ai_agent_logs con ese mismo id.
    // Es preferible romper la llamada que atribuirla a la organización errónea.
    if (!organizationId) {
      throw new Error('[ExecutionPipeline] Falta organizationId: no se ejecuta un agente sin saber de qué organización es.');
    }

    const agent = agentRegistry.get(agentName);

    if (!agent) {
      throw new Error(`[ExecutionPipeline] Agente '${agentName}' no encontrado en AgentRegistry.`);
    }

    const providerName = requestedProvider || this.defaultProvider;
    const provider = this.providers[providerName] || this.providers.openai;

    let output = null;
    let status = 'success';
    let errorMessage = null;

    try {
      if (typeof agent.execute === 'function') {
        output = await agent.execute(input, { provider, organizationId });
      } else if (typeof agent.run === 'function') {
        output = await agent.run(input, { provider, organizationId });
      } else {
        throw new Error(`[ExecutionPipeline] El agente '${agentName}' no tiene un método execute() o run() válido.`);
      }
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      console.error(`[ExecutionPipeline] Error ejecutando agente '${agentName}':`, err);
      throw err;
    } finally {
      const durationMs = Date.now() - startTime;

      // Registrar resultado de forma segura en ai_agent_logs
      if (supabaseClient) {
        try {
          await supabaseClient.from('ai_agent_logs').insert({
            organization_id: organizationId,
            agent_name: agentName,
            input_payload: input,
            output_response: output || { error: errorMessage },
            status,
            duration_ms: durationMs,
            created_at: new Date().toISOString(),
          });
        } catch (logErr) {
          console.warn('[ExecutionPipeline] Error no bloqueante registrando en ai_agent_logs:', logErr.message);
        }
      }
    }

    return {
      success: status === 'success',
      agentName,
      providerUsed: providerName,
      durationMs: Date.now() - startTime,
      output,
    };
  }
}

const pipelineInstance = new ExecutionPipeline();
module.exports = pipelineInstance;
