require('dotenv').config();
const { StripeConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/StripeConnector');
const { CalendlyConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/CalendlyConnector');
const { TallyConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/TallyConnector');
const { KajabiConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/KajabiConnector');

async function runTests() {
  console.log('=== RUNNING CONNECTORS BACKFILL TESTS ===\n');

  const stripe = new StripeConnector();
  const calendly = new CalendlyConnector();
  const tally = new TallyConnector();
  const kajabi = new KajabiConnector();

  const orgId = '00000000-0000-0000-0000-000000000001';

  console.log('[TEST 1] Testing StripeConnector backfill without key (safe empty return)...');
  const stripeRes = await stripe.backfill({}, new Date(), orgId);
  if (Array.isArray(stripeRes) && stripeRes.length === 0) {
    console.log('PASS: StripeConnector safely returns empty array when unconfigured.');
  } else {
    console.error('FAIL: StripeConnector unexpected return:', stripeRes);
    process.exit(1);
  }

  console.log('[TEST 2] Testing CalendlyConnector backfill without connection...');
  const calRes = await calendly.backfill({}, new Date(), orgId);
  if (Array.isArray(calRes) && calRes.length === 0) {
    console.log('PASS: CalendlyConnector safely returns empty array when unconfigured.');
  } else {
    console.error('FAIL: CalendlyConnector unexpected return:', calRes);
    process.exit(1);
  }

  console.log('[TEST 3] Testing TallyConnector backfill without key...');
  const tallyRes = await tally.backfill({}, new Date(), orgId);
  if (Array.isArray(tallyRes) && tallyRes.length === 0) {
    console.log('PASS: TallyConnector safely returns empty array when unconfigured.');
  } else {
    console.error('FAIL: TallyConnector unexpected return:', tallyRes);
    process.exit(1);
  }

  console.log('[TEST 4] Testing KajabiConnector backfill without key...');
  const kajabiRes = await kajabi.backfill({}, new Date(), orgId);
  if (Array.isArray(kajabiRes) && kajabiRes.length === 0) {
    console.log('PASS: KajabiConnector safely returns empty array when unconfigured.');
  } else {
    console.error('FAIL: KajabiConnector unexpected return:', kajabiRes);
    process.exit(1);
  }

  console.log('\n=== CONNECTORS BACKFILL TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
