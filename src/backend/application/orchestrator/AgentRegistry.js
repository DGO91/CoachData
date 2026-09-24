// src/backend/application/orchestrator/AgentRegistry.js

/**
 * AgentRegistry — Singleton central para el registro de agentes en CoachData OS v2.
 * Permite registrar, consultar y validar instancias de agentes de forma segura.
 */
class AgentRegistry {
  constructor() {
    if (AgentRegistry.instance) {
      return AgentRegistry.instance;
    }
    this.agents = new Map();
    AgentRegistry.instance = this;
  }

  /**
   * Registra un agente en el registro.
   * @param {string} name - Nombre único del agente (ej: 'pre_call')
   * @param {Object} agent - Objeto o clase del agente que implementa execute(input, context)
   */
  register(name, agent) {
    if (!name || typeof name !== 'string') {
      throw new Error('[AgentRegistry] El nombre del agente debe ser un string válido.');
    }

    if (this.agents.has(name)) {
      console.warn(`[AgentRegistry] Advertencia: El agente '${name}' ya estaba registrado. Sobrescribiendo registro.`);
    }

    if (!agent || (typeof agent.execute !== 'function' && typeof agent.run !== 'function')) {
      throw new Error(`[AgentRegistry] El agente '${name}' debe exponer un método 'execute' o 'run'.`);
    }

    this.agents.set(name, agent);
    console.log(`[AgentRegistry] ✅ Agente registrado exitosamente: '${name}'`);
    return agent;
  }

  /**
   * Obtiene un agente por nombre.
   */
  get(name) {
    return this.agents.get(name) || null;
  }

  /**
   * Comprueba si un agente existe.
   */
  has(name) {
    return this.agents.has(name);
  }

  /**
   * Lista los nombres de todos los agentes registrados.
   */
  list() {
    return Array.from(this.agents.keys());
  }

  /**
   * Elimina un agente del registro.
   */
  remove(name) {
    return this.agents.delete(name);
  }
}

const instance = new AgentRegistry();
Object.freeze(instance);

module.exports = instance;
