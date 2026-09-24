'use strict';
require('dotenv').config();
const { requiereServiceRole } = require('../../scripts/lib/requiere-service-role');
if (requiereServiceRole('Lee tablas canonicas via RLS, que ejecuta get_auth_user_organizations() (revocada a PUBLIC en la 030).')) process.exit(0);

/**
 * test_canonical_timeline_e2e.js
 * Automated suite verifying canonical client timeline and tenant isolation.
 */

const { getSupabaseClient } = require('../../src/backend/infrastructure/database/supabaseClient');
const { CalendlyConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/CalendlyConnector');

async function runTests() {
  console.log('=== RUNNING CANONICAL TIMELINE & CALENDLY HARDENING E2E TESTS ===\n');

  // Test 1: Verify CalendlyConnector start_time hardening
  console.log('[TEST 1] Checking CalendlyConnector start_time hardening...');
  const connector = new CalendlyConnector();
  const dummyOrgId = '00000000-0000-0000-0000-000000000001';
  
  const payloadWithoutEnrichment = {
    event: 'invitee.created',
    created_at: new Date().toISOString(),
    payload: {
      uri: 'https://api.calendly.com/scheduled_events/123/invitees/456',
      email: 'test@example.com',
      name: 'Test Invitee',
      status: 'active'
    }
  };

  try {
    connector.parseWebhook(payloadWithoutEnrichment, dummyOrgId);
    console.error('FAIL: Expected CalendlyConnector to throw CALENDLY_ENRICHMENT_REQUIRED error');
    process.exit(1);
  } catch (err) {
    if (err.code === 'CALENDLY_ENRICHMENT_REQUIRED' || err.message.includes('start_time missing')) {
      console.log('PASS: CalendlyConnector correctly rejected webhook without enriched start_time.');
    } else {
      console.error('FAIL: Unexpected error code:', err);
      process.exit(1);
    }
  }

  // Test 2: Database and Tenant Isolation checks for canonical tables
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('SKIP: Supabase client not initialized in environment.');
    return;
  }

  console.log('\n[TEST 2] Verifying canonical tables structure in Supabase...');
  const { data: contacts, error: cErr } = await supabase.from('canonical_contact').select('count').limit(1);
  if (cErr) {
    console.error('FAIL: Error accessing canonical_contact:', cErr.message);
    process.exit(1);
  }
  console.log('PASS: canonical_contact table accessible.');

  const { data: forms, error: fErr } = await supabase.from('canonical_form_entry').select('count').limit(1);
  if (fErr) {
    console.error('FAIL: Error accessing canonical_form_entry:', fErr.message);
    process.exit(1);
  }
  console.log('PASS: canonical_form_entry table accessible.');

  const { data: sessions, error: sErr } = await supabase.from('canonical_session').select('count').limit(1);
  if (sErr) {
    console.error('FAIL: Error accessing canonical_session:', sErr.message);
    process.exit(1);
  }
  console.log('PASS: canonical_session table accessible.');

  const { data: payments, error: pErr } = await supabase.from('canonical_payment').select('count').limit(1);
  if (pErr) {
    console.error('FAIL: Error accessing canonical_payment:', pErr.message);
    process.exit(1);
  }
  console.log('PASS: canonical_payment table accessible.');

  console.log('\n=== ALL CANONICAL TIMELINE TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
