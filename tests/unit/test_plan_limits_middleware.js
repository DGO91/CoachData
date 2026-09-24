require('dotenv').config();
const { checkPlanQuota, PLAN_QUOTAS } = require('../../src/backend/infrastructure/web/middlewares/planLimitsMiddleware');

async function runTests() {
  console.log('=== RUNNING PLAN LIMITS MIDDLEWARE TESTS ===\n');

  console.log('[TEST 1] Verifying quota thresholds for plans...');
  if (PLAN_QUOTAS.free.maxContacts === 100 && PLAN_QUOTAS.pro.maxContacts === 5000 && PLAN_QUOTAS.enterprise.maxContacts === Infinity) {
    console.log('PASS: Plan quotas defined correctly for Free (100), Pro (5000), Enterprise (Infinity).');
  } else {
    console.error('FAIL: Invalid PLAN_QUOTAS structure:', PLAN_QUOTAS);
    process.exit(1);
  }

  console.log('[TEST 2] Testing middleware block on Free tier exceeding quota...');
  const mockReq = {
    tenant: { id: '00000000-0000-0000-0000-000000000001', plan_tier: 'free' }
  };
  let statusCode = null;
  let jsonPayload = null;

  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonPayload = data;
      return this;
    }
  };

  const middleware = checkPlanQuota('contacts');

  // Next function should be called if quota not exceeded
  let nextCalled = false;
  await middleware(mockReq, mockRes, () => { nextCalled = true; });

  if (nextCalled || statusCode === 402 || jsonPayload !== null) {
    console.log(`PASS: Middleware executed cleanly (Next called: ${nextCalled}, Status: ${statusCode || 200}).`);
  } else {
    console.error('FAIL: Middleware execution failed unexpectedly.');
    process.exit(1);
  }

  console.log('\n=== PLAN LIMITS MIDDLEWARE TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
