require('dotenv').config();
const { getAuthenticatedOAuth2Client } = require('../../src/backend/infrastructure/services/googleIntegrationService');

async function runTests() {
  console.log('=== RUNNING GOOGLE OAUTH HARDENING TESTS ===\n');

  // Test 1: Verify getAuthenticatedOAuth2Client handles missing tenant gracefully without crashing
  console.log('[TEST 1] Testing missing tenant credential lookup...');
  try {
    const client = await getAuthenticatedOAuth2Client('00000000-0000-0000-0000-000000000999', 'google_mail_oauth');
    if (client === null) {
      console.log('PASS: getAuthenticatedOAuth2Client returned null safely without throwing TypeError.');
    } else {
      console.error('FAIL: Expected null for unconnected tenant.');
      process.exit(1);
    }
  } catch (err) {
    console.error('FAIL: getAuthenticatedOAuth2Client threw error:', err);
    process.exit(1);
  }

  console.log('\n=== GOOGLE OAUTH HARDENING TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
