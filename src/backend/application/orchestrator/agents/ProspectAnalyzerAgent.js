// src/backend/application/orchestrator/agents/ProspectAnalyzerAgent.js

const { getEffectiveAISettings } = require('../helpers/getEffectiveAISettings');
const { buildProspectAnalyzerPrompt } = require('../prompts/buildProspectAnalyzerPrompt');

class ProspectAnalyzerAgent {
  constructor() {
    this.name = 'prospect_analyzer';
    this.description = 'Analiza prospectos de LinkedIn/web y genera scoring de oportunidad operativa multi-tenant.';
  }

  async execute(input, context = {}) {
    const { provider, organizationId } = context;
    const { name = 'Prospecto', company = 'Empresa Desconocida', website = '', linkedinProfile = '', problem = '' } = input;

    // Resolve multi-tenant organization AI settings with neutral compatibility fallback
    const settings = await getEffectiveAISettings(organizationId);

    // Build dynamic multi-tenant prompt
    const systemPrompt = buildProspectAnalyzerPrompt({
      businessName: settings.business_name,
      businessDescription: settings.business_description,
      industrySector: settings.industry_sector,
      targetClientProfile: settings.target_client_profile,
      serviceCatalog: settings.service_catalog,
      analysisGoals: settings.analysis_goals,
      communicationStyle: settings.communication_style,
      assistantName: settings.assistant_name
    });

    const userPrompt = `Analyze the following prospect:
- Contact Name: ${name}
- Company Name: ${company}
- Website: ${website || 'N/A'}
- LinkedIn: ${linkedinProfile || 'N/A'}
- Pain / Description: ${problem || 'N/A'}

Provide the structured analysis adhering strictly to the JSON schema in system instructions.`;

    const result = await provider.generate({ systemPrompt, userPrompt, temperature: 0.4 });
    return {
      agent: this.name,
      prospectName: name,
      company,
      rawOutput: result.text,
      provider: result.provider,
    };
  }
}

module.exports = ProspectAnalyzerAgent;
