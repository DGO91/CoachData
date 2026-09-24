/**
 * getEffectiveAISettings.js
 * Multi-Tenant AI Configuration Resolver — CoachData Operational OS v2
 * 
 * TEMPORARY_COMPATIBILITY_LAYER
 * Provides a neutral, non-branded fallback for organizations that do not yet
 * have custom organization_ai_settings configured.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

async function getEffectiveAISettings(organizationId) {
  if (supabase && organizationId) {
    try {
      const { data, error } = await supabase
        .from('organization_ai_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn(`[getEffectiveAISettings] Error fetching settings for org ${organizationId}:`, err.message);
    }
  }

  // TEMPORARY_COMPATIBILITY_LAYER Neutral Fallback
  return {
    business_name: 'Business Operations',
    business_description: 'General operational and growth advisory business',
    industry_sector: 'business_coach_consulting',
    target_client_profile: 'Coaches, consultants and service providers',
    service_catalog: [
      'Lead follow-up systems',
      'Sales pipeline optimization',
      'Client onboarding automation',
      'Operational reporting'
    ],
    analysis_goals: [
      'bottleneck_detection',
      'funnel_maturity_assessment',
      'automation_prioritization',
      'next_best_action'
    ],
    communication_style: {
      tone: 'professional',
      style: 'executive',
      language: 'neutral'
    },
    reporting_preferences: {
      detail_level: 'standard',
      include_recommendations: true
    },
    assistant_name: 'Operations Assistant'
  };
}

module.exports = { getEffectiveAISettings };
