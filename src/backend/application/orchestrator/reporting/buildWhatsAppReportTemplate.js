/**
 * buildWhatsAppReportTemplate.js
 * Multi-Tenant WhatsApp Report Template Builder — CoachData Operational OS v2
 */

const { formatReportDate } = require('./formatReportDate');

function buildWhatsAppReportTemplate({
  organizationSettings = {},
  reportType = 'DAILY_OPERATIONS',
  metrics = {},
  recommendations = [],
  generatedAt = new Date()
}) {
  const assistantName = organizationSettings.assistant_name || 'Operations Assistant';
  const businessName = organizationSettings.business_name || 'Business Operations';
  const timezone = organizationSettings.reporting_preferences?.timezone || 'Europe/Madrid';
  const language = organizationSettings.communication_style?.language || 'es';
  const locale = language === 'en' ? 'en-US' : 'es-ES';

  const formattedDate = formatReportDate(generatedAt, timezone, locale);

  if (reportType === 'WEEKLY_EXECUTIVE') {
    const newOpps = metrics.newOpportunities ?? metrics.new_leads ?? 0;
    const pipeValue = metrics.pipelineValue ?? metrics.pipeline_value ?? '$0.00';
    const conversion = metrics.conversionInsights ?? metrics.conversion_rate ?? 'Standard';
    const risks = Array.isArray(metrics.operationalRisks) && metrics.operationalRisks.length > 0
      ? metrics.operationalRisks.map(r => `• ${r}`).join('\n')
      : '• No critical risks detected.';
    const recs = Array.isArray(recommendations) && recommendations.length > 0
      ? recommendations.map(r => `• ${r}`).join('\n')
      : '• Continue current operational cadence.';

    return `[${assistantName}]

${businessName} — Weekly Executive Summary

Period: ${formattedDate}

New opportunities: ${newOpps}
Pipeline value: ${pipeValue}
Conversion insights: ${conversion}

Operational risks:
${risks}

Recommended actions:
${recs}

Generated automatically for your organization.`;
  }

  // DEFAULT: DAILY_OPERATIONS
  const newLeads = metrics.newLeads ?? metrics.new_leads ?? 0;
  const pendingFollowups = metrics.pendingFollowups ?? metrics.pending_followups ?? 0;
  const tasksDue = metrics.tasksDueToday ?? metrics.tasks_due_today ?? 0;
  const priorityActions = Array.isArray(recommendations) && recommendations.length > 0
    ? recommendations.map(a => `• ${a}`).join('\n')
    : '• Review pending lead follow-ups in CRM.';

  return `[${assistantName}]

${businessName} — Daily Operations Report

Date: ${formattedDate}

New leads: ${newLeads}
Pending follow-ups: ${pendingFollowups}
Tasks due today: ${tasksDue}

Priority actions:
${priorityActions}

Generated automatically for your organization.`;
}

module.exports = { buildWhatsAppReportTemplate };
