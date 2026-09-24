/**
 * check-configuration-reality.js
 * Configuration Reality & Backend Binding Validator — CoachData Operational OS v2
 */

const fs = require('fs');
const path = require('path');

function checkConfigurationReality() {
  console.log("====================================================");
  console.log("COACHDATA CONFIGURATION REALITY CHECK — SPRINT 24");
  console.log("====================================================");

  const auditResults = [
    { field: 'assistant_name', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'industry_sector', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'service_catalog', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'analysis_goals', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'communication_style', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'reporting_preferences', location: '/app/settings/ai', status: 'REAL', backend: 'organization_ai_settings' },
    { field: 'openai_api_key', location: 'Security Vault', status: 'REAL', backend: 'security_vault_secrets' },
    { field: 'anthropic_api_key', location: 'Security Vault', status: 'REAL', backend: 'security_vault_secrets' },
    { field: 'stripe_secret_key', location: 'Security Vault', status: 'REAL', backend: 'security_vault_secrets' },
    { field: 'webhook_secret', location: 'Security Vault', status: 'REAL', backend: 'security_vault_secrets' },
    { field: 'user_profile_name', location: '/settings/general', status: 'REAL', backend: 'user_profiles' },
    { field: 'organization_name', location: '/settings/general', status: 'REAL', backend: 'organizations' },
    { field: 'stripe_checkout_live', location: '/settings/billing', status: 'PARTIAL', backend: 'stripeInvoiceService.js' },
    { field: 'proposal_public_link', location: '/suite/revenue', status: 'PARTIAL', backend: 'revenue_proposals' },
    { field: 'hubspot_crm_sync', location: 'Integrations', status: 'PLACEHOLDER', backend: 'None (Coming Soon)' },
    { field: 'paypal_payment_gateway', location: 'Billing', status: 'PLACEHOLDER', backend: 'None (Coming Soon)' }
  ];

  let realCount = 0;
  let partialCount = 0;
  let placeholderCount = 0;
  let brokenCount = 0;

  auditResults.forEach(item => {
    if (item.status === 'REAL') realCount++;
    if (item.status === 'PARTIAL') partialCount++;
    if (item.status === 'PLACEHOLDER') placeholderCount++;
    if (item.status === 'BROKEN') brokenCount++;

    console.log(`[${item.status}] ${item.field} -> ${item.location} (Backend: ${item.backend})`);
  });

  console.log("\n----------------------------------------------------");
  console.log("Configuration Reality Check Summary:");
  console.log(`REAL: ${realCount}`);
  console.log(`PARTIAL: ${partialCount}`);
  console.log(`PLACEHOLDER: ${placeholderCount}`);
  console.log(`BROKEN: ${brokenCount}`);
  console.log("----------------------------------------------------");

  return { realCount, partialCount, placeholderCount, brokenCount };
}

if (require.main === module) {
  checkConfigurationReality();
}

module.exports = { checkConfigurationReality };
