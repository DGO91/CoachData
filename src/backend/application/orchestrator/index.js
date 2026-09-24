// src/backend/application/orchestrator/index.js
const agentRegistry = require('./AgentRegistry');
const executionPipeline = require('./ExecutionPipeline');
const ProspectAnalyzerAgent = require('./agents/ProspectAnalyzerAgent');
const PreCallAgent = require('./agents/PreCallAgent');
const WeeklyDigestAgent = require('./agents/WeeklyDigestAgent');
const EveningSummaryAgent = require('./agents/EveningSummaryAgent');
const KnowledgeSearchAgent = require('./agents/KnowledgeSearchAgent');
const LeadQualifierAgent = require('./agents/LeadQualifierAgent');
const { wrapLegacyAgent } = require('./legacyCompatibility');

// Inicializar e inscribir agentes oficiales en AgentRegistry
function bootAIOrchestrator() {
  console.log('\n[AI Orchestrator V2] Booting Intelligence Engine...');

  agentRegistry.register('prospect_analyzer', new ProspectAnalyzerAgent());
  agentRegistry.register('pre_call', new PreCallAgent());
  agentRegistry.register('weekly_digest', new WeeklyDigestAgent());
  agentRegistry.register('evening_summary', new EveningSummaryAgent());
  agentRegistry.register('knowledge_search', new KnowledgeSearchAgent());
  agentRegistry.register('lead_qualifier', new LeadQualifierAgent());

  // Envolver agentes legacy para migración gradual sin romper puertos
  wrapLegacyAgent('prospect_personalizer_legacy', 'Agente legacy de personalización de prospectos');
  wrapLegacyAgent('mentor_space_legacy', 'Agente legacy de Mentorship');

  console.log(`[AI Orchestrator V2] Agentes activos: ${agentRegistry.list().join(', ')}\n`);
}

// No se arranca al importar: server.js llama a bootAIOrchestrator() antes de
// montar las rutas. Hacerlo también aquí registraba los agentes dos veces y
// dejaba un aviso de registro duplicado en cada arranque. Los consumidores
// (intelligenceRoutes, AutomationDispatcher) importan AgentRegistry y
// ExecutionPipeline directamente, así que reciben el singleton ya poblado.

module.exports = {
  agentRegistry,
  executionPipeline,
  bootAIOrchestrator,
};
