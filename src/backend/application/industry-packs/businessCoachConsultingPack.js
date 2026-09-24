/**
 * businessCoachConsultingPack.js
 * Official Industry Pack: Business Coach & Consulting — CoachData Operational OS v2
 */

const businessCoachConsultingPack = {
  sector: 'business_coach_consulting',

  defaultAssistantName: 'Growth & Operations Assistant',

  defaultTargetClientProfile:
    'Business coaches, consultants, strategists, mentors and premium service providers',

  defaultServiceCatalog: [
    'Lead follow-up systems',
    'Sales pipeline optimization',
    'Discovery call conversion',
    'Client onboarding automation',
    'VIP client ascension',
    'Operational reporting'
  ],

  defaultAnalysisGoals: [
    'bottleneck_detection',
    'sales_conversion_improvement',
    'funnel_maturity_assessment',
    'automation_prioritization',
    'client_retention_analysis',
    'next_best_action'
  ],

  defaultCommunicationStyle: {
    tone: 'executive',
    style: 'balanced',
    language: 'es'
  },

  defaultReportingPreferences: {
    detail_level: 'standard',
    include_recommendations: true,
    include_metrics: true,
    delivery_channel: 'whatsapp',
    daily_report_enabled: true,
    weekly_report_enabled: true,
    delivery_time: '08:00',
    timezone: 'Europe/Madrid'
  }
};

module.exports = { businessCoachConsultingPack };
