require('dotenv').config();
const { requiereServiceRole } = require('../../scripts/lib/requiere-service-role');
if (requiereServiceRole('Lee tablas canonicas via RLS, que ejecuta get_auth_user_organizations() (revocada a PUBLIC en la 030).')) process.exit(0);
const { CanonicalAgentContext } = require('../../src/backend/modules/integrations/application/CanonicalAgentContext');
const { getSupabaseClient } = require('../../src/backend/infrastructure/database/supabaseClient');

async function runTests() {
  console.log('=== RUNNING MCP CANONICAL FACADE TESTS ===\n');

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('SKIP: Supabase client not initialized in environment.');
    return;
  }

  const facade = new CanonicalAgentContext(supabase);
  const dummyOrgId = '00000000-0000-0000-0000-000000000001';

  console.log('[TEST 1] Fetching unified context for test org...');
  const ctx = await facade.getUnifiedContext(dummyOrgId, { limit: 5 });
  if (Array.isArray(ctx.contacts) && Array.isArray(ctx.payments) && Array.isArray(ctx.sessions) && Array.isArray(ctx.formEntries)) {
    console.log('PASS: getUnifiedContext returned all 4 canonical entity arrays.');
  } else {
    console.error('FAIL: Invalid structure returned by getUnifiedContext:', ctx);
    process.exit(1);
  }

  console.log('[TEST 2] Formatting markdown prompt summary for agents...');
  const summary = await facade.getPromptSummary(dummyOrgId);
  if (typeof summary === 'string' && summary.includes('DATOS CANÓNICOS EN TIEMPO REAL')) {
    console.log('PASS: getPromptSummary generated valid markdown summary.');
  } else {
    console.error('FAIL: Invalid prompt summary generated:', summary);
    process.exit(1);
  }

  console.log('\n=== MCP CANONICAL FACADE TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
