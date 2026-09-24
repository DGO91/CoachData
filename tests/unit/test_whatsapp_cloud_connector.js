require('dotenv').config();
const crypto = require('crypto');
const { WhatsAppCloudConnector } = require('../../src/backend/modules/integrations/infrastructure/connectors/WhatsAppCloudConnector');

async function runTests() {
  console.log('=== RUNNING WHATSAPP CLOUD CONNECTOR TESTS ===\n');

  const connector = new WhatsAppCloudConnector();
  const secret = 'meta_test_app_secret_12345';
  const orgId = '00000000-0000-0000-0000-000000000001';

  // Sample official Meta WhatsApp Cloud webhook body
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'ACCOUNT_123',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          contacts: [{ profile: { name: 'Maria Garcia' }, wa_id: '34600112233' }],
          messages: [{
            from: '34600112233',
            id: 'wamid.HBgL1234567890',
            timestamp: '1786636000',
            text: { body: 'Hola, informacion del programa de coaching' },
            type: 'text'
          }]
        }
      }]
    }]
  };

  const rawBody = JSON.stringify(payload);
  const signatureHash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const validHeaders = { 'x-hub-signature-256': `sha256=${signatureHash}` };

  console.log('[TEST 1] Signature Verification (Valid Meta Signature)...');
  const verified = connector.verifySignature(rawBody, validHeaders, secret);
  if (verified === true) {
    console.log('PASS: Valid x-hub-signature-256 successfully verified.');
  } else {
    console.error('FAIL: Signature verification failed.');
    process.exit(1);
  }

  console.log('[TEST 2] Parsing Official Meta WhatsApp Payload...');
  const events = connector.parseWebhook(payload, orgId);
  if (events.length === 2 && events[0].entityType === 'contact' && events[1].entityType === 'form_entry') {
    console.log('PASS: Correctly mapped 2 canonical events (CONTACT and FORM_ENTRY).');
  } else {
    console.error('FAIL: Parsing returned invalid events length or types:', events);
    process.exit(1);
  }

  console.log('\n=== WHATSAPP CLOUD CONNECTOR TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
