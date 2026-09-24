/**
 * createBusinessCoachAIConfiguration.js
 * Automatic Onboarding Configuration Helper — CoachData Operational OS v2
 */

const { businessCoachConsultingPack } = require('../industry-packs/businessCoachConsultingPack');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function createBusinessCoachAIConfiguration({
  organizationId,
  businessName,
  businessDescription = '',
  targetClients = '',
  services = [],
  primaryGoal = 'increase_leads',
  assistantName = '',
  language = 'es'
}) {
  if (!organizationId) {
    throw new Error('createBusinessCoachAIConfiguration requires organizationId');
  }

  const finalAssistantName = assistantName || businessCoachConsultingPack.defaultAssistantName;
  const finalServices = (Array.isArray(services) && services.length > 0)
    ? services
    : businessCoachConsultingPack.defaultServiceCatalog;
  const finalTargetProfile = targetClients || businessCoachConsultingPack.defaultTargetClientProfile;

  const payload = {
    organization_id: organizationId,
    business_name: businessName || 'Mi Negocio de Consultoría',
    business_description: businessDescription || 'Servicios profesionales de coaching y consultoría estratégica',
    industry_sector: businessCoachConsultingPack.sector,
    target_client_profile: finalTargetProfile,
    service_catalog: finalServices,
    analysis_goals: businessCoachConsultingPack.defaultAnalysisGoals,
    communication_style: {
      ...businessCoachConsultingPack.defaultCommunicationStyle,
      language
    },
    reporting_preferences: businessCoachConsultingPack.defaultReportingPreferences,
    assistant_name: finalAssistantName,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('organization_ai_settings')
      .upsert(payload, { onConflict: 'organization_id' })
      .select()
      .single();

    if (error) {
      console.error('[createBusinessCoachAIConfiguration] Supabase error:', error.message);
      throw error;
    }
    return data;
  }

  // Fallback return for mock environments
  return { id: `mock_config_${Date.now()}`, ...payload };
}

module.exports = { createBusinessCoachAIConfiguration };
