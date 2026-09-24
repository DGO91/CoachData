// src/backend/application/orchestrator/legacyCompatibility.js
const agentRegistry = require('./AgentRegistry');

/**
 * Capa de compatibilidad para envolver procesos de agentes legacy en la interfaz V2 del Orchestrator.
 */
function wrapLegacyAgent(agentName, description, legacyFn) {
  const wrappedAgent = {
    name: agentName,
    description: description || `Agente Legacy envuelto: ${agentName}`,
    execute: async (input, context) => {
      console.log(`[LegacyCompatibility] Ejecutando agente legacy: ${agentName}`);
      if (typeof legacyFn === 'function') {
        const result = await legacyFn(input, context);
        return {
          agent: agentName,
          isLegacy: true,
          result,
        };
      }
      return {
        agent: agentName,
        isLegacy: true,
        message: `Simulación de agente legacy ${agentName}`,
        input,
      };
    },
  };

  agentRegistry.register(agentName, wrappedAgent);
  return wrappedAgent;
}

module.exports = {
  wrapLegacyAgent,
};
