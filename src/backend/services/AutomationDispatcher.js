// src/backend/services/AutomationDispatcher.js
// CoachData Operational OS v2 — Multi-Tenant Make.com Automation Dispatcher
// Each tenant stores their own Make.com webhook URLs in the Security Vault (client_provider_keys).
// Dispatcher reads the per-tenant URL and fires the event with a standardized payload.

const { getSupabaseClient } = require('../infrastructure/database/supabaseClient');
const { decrypt } = require('../infrastructure/services/encryptionService');

// Make.com standard event → provider_name mapping in Security Vault
const WEBHOOK_KEY_MAP = {
  leadhub_sync:                'make_webhook_leadhub_sync',
  revenue_chief_approved:      'make_webhook_chief_approved',
  call_intelligence_approved:  'make_webhook_call_approved',
  proposal_approved:           'make_webhook_proposal_approved'
};

/**
 * Get the Make.com webhook URL for a specific tenant + event from the Security Vault.
 * Returns null if not configured (graceful degradation).
 */
async function getMakeWebhookUrl(tenantId, eventKey) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const providerName = WEBHOOK_KEY_MAP[eventKey];
  if (!providerName) return null;

  const { data: record, error } = await supabase
    .from('client_provider_keys')
    .select('api_key_encrypted')
    .eq('tenant_id', tenantId)
    .eq('provider_name', providerName)
    .maybeSingle();

  if (error || !record?.api_key_encrypted) return null;

  try {
    return decrypt(record.api_key_encrypted); // The decrypted value IS the webhook URL
  } catch (e) {
    console.error('[AutomationDispatcher] Failed to decrypt webhook URL:', e.message);
    return null;
  }
}

/**
 * Log an automation event to the automation_logs table.
 */
async function logAutomationEvent({ tenantId, eventKey, payload, status, webhookFired, error }) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  await supabase.from('automation_logs').insert({
    tenant_id: tenantId,
    event_key: eventKey,
    payload: payload,
    status: status, // 'success' | 'partial' | 'failed'
    webhook_fired: webhookFired,
    error_message: error || null,
    triggered_at: new Date().toISOString()
  }).catch(e => console.error('[AutomationDispatcher] Failed to log automation:', e.message));
}

/**
 * Dispatch an automation event for a tenant.
 * 1. Fires the Make.com webhook (if configured for this tenant).
 * 2. Returns { success, webhookFired, makeResponse, error }.
 * 
 * The caller is responsible for the Supabase DB writes.
 * This service only handles the Make.com outbound call.
 */
async function dispatch(tenantId, eventKey, payload) {
  const result = { success: false, webhookFired: false, makeResponse: null, error: null };

  try {
    const webhookUrl = await getMakeWebhookUrl(tenantId, eventKey);

    if (!webhookUrl) {
      console.log(`[AutomationDispatcher] No Make.com webhook configured for tenant ${tenantId} event "${eventKey}". Skipping webhook, DB ops will proceed.`);
      result.success = true; // Graceful: DB ops still run without Make
      result.webhookFired = false;

      await logAutomationEvent({
        tenantId, eventKey, payload,
        status: 'partial',
        webhookFired: false,
        error: 'No Make.com webhook URL configured for this event'
      });
      return result;
    }

    // Standard CoachData → Make.com payload envelope
    const makePayload = {
      coachdata_event: eventKey,
      tenant_id: tenantId,
      timestamp: new Date().toISOString(),
      data: payload
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CoachData-Event': eventKey,
        'X-CoachData-Tenant': tenantId
      },
      body: JSON.stringify(makePayload),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Make.com webhook returned HTTP ${response.status}`);
    }

    result.success = true;
    result.webhookFired = true;
    result.makeResponse = { status: response.status };

    await logAutomationEvent({
      tenantId, eventKey, payload,
      status: 'success',
      webhookFired: true
    });

    console.log(`[AutomationDispatcher] ✓ Fired "${eventKey}" for tenant ${tenantId} → Make.com`);

  } catch (err) {
    result.error = err.message;
    result.success = false;
    console.error(`[AutomationDispatcher] ✗ Failed "${eventKey}" for tenant ${tenantId}:`, err.message);

    await logAutomationEvent({
      tenantId, eventKey, payload,
      status: 'failed',
      webhookFired: false,
      error: err.message
    });
  }

  return result;
}

module.exports = { dispatch, getMakeWebhookUrl, WEBHOOK_KEY_MAP };
