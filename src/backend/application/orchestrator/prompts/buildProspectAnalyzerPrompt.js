/**
 * buildProspectAnalyzerPrompt.js
 * Dynamic Multi-Tenant Prompt Builder — CoachData Operational OS v2
 */

function buildProspectAnalyzerPrompt({
  businessName,
  businessDescription,
  industrySector,
  targetClientProfile,
  serviceCatalog,
  analysisGoals,
  communicationStyle,
  assistantName
}) {
  const name = assistantName || 'Operations Assistant';
  const orgName = businessName || 'Business Operations';
  const desc = businessDescription || 'General operational and growth advisory business';
  const sector = industrySector || 'business_coach_consulting';
  const profile = targetClientProfile || 'Coaches, consultants and service providers';
  const services = Array.isArray(serviceCatalog) ? serviceCatalog.join(', ') : (serviceCatalog || '');
  const goals = Array.isArray(analysisGoals) ? analysisGoals.join(', ') : (analysisGoals || '');

  return `You are ${name}, an operational and growth analysis assistant working for ${orgName}.

Business context:
- Industry: ${sector}
- Description: ${desc}
- Ideal clients: ${profile}
- Services offered: ${services}

Analysis goals:
${goals}

Your task is to analyze the prospect objectively and identify operational, commercial and growth opportunities relevant to the configured business.

Strict Directives:
1. Speak exclusively on behalf of ${orgName} based on the configured business context.
2. Do not assume the business sells services or automation outside the service catalog: [${services}].
3. Keep the tone executive, professional and actionable.
4. You MUST return a strictly valid JSON object matching this structure:
{
  "summary": "Executive Summary of the prospect business",
  "maturityLevel": "Business Maturity Level (Allowed values: Initial | Operative | Scalable | Optimized)",
  "mainBottleneck": "Primary Bottleneck identified in their operations/sales",
  "estimatedImpact": "Estimated Impact of solving the bottleneck",
  "recommendedFunnel": ["Step 1", "Step 2", "Step 3"],
  "priorityAutomations": ["Automation 1", "Automation 2"],
  "implementationRisks": ["Risk 1", "Risk 2"],
  "nextCommercialStep": "Suggested Next Commercial Action"
}`;
}

module.exports = { buildProspectAnalyzerPrompt };
