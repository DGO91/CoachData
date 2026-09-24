require('dotenv').config();
const { BackfillOrchestrator } = require('../../src/backend/modules/integrations/application/BackfillOrchestrator');
const { ConnectorRegistry } = require('../../src/backend/modules/integrations/application/ConnectorRegistry');
const { IngestionDispatcher } = require('../../src/backend/modules/integrations/application/IngestionDispatcher');
const { CanonicalEvent } = require('../../src/backend/modules/integrations/domain/CanonicalEvent');
const { EntityTypes } = require('../../src/backend/modules/integrations/domain/EntityTypes');
const { IConnector } = require('../../src/backend/modules/integrations/application/ports/IConnector');

class MockConnector extends IConnector {
  get id() { return 'mock_provider'; }
  get category() { return 'crm'; }
  get auth() { return 'nango'; }
  get capabilities() { return ['contacts']; }
  verifySignature() { return true; }
  parseWebhook() { return []; }
  async backfill(credentials, since, organizationId) {
    return [
      new CanonicalEvent({
        entityType: EntityTypes.CONTACT,
        organizationId: organizationId || '00000000-0000-0000-0000-000000000001',
        sourceProvider: 'mock_provider',
        sourceId: 'mock_c_1',
        fields: { email: 'coach.client@example.com', full_name: 'Coach Client' },
        rawPayload: { id: 'mock_c_1' },
        occurredAt: new Date(),
      }),
      new CanonicalEvent({
        entityType: EntityTypes.CONTACT,
        organizationId: organizationId || '00000000-0000-0000-0000-000000000001',
        sourceProvider: 'mock_provider',
        sourceId: 'mock_c_2',
        fields: { email: 'coach.client2@example.com', full_name: 'Coach Client 2' },
        rawPayload: { id: 'mock_c_2' },
        occurredAt: new Date(),
      })
    ];
  }
  async healthCheck() { return { ok: true }; }
}

async function runTests() {
  console.log('=== RUNNING BACKFILL ORCHESTRATOR TESTS ===\n');

  const upsertedEvents = [];
  const mockRepo = {
    async upsert(event) {
      upsertedEvents.push(event);
      return { success: true };
    }
  };

  const registry = new ConnectorRegistry().register(new MockConnector());
  const ingestion = new IngestionDispatcher({ canonicalRepository: mockRepo });
  const orchestrator = new BackfillOrchestrator({ connectorRegistry: registry, ingestionDispatcher: ingestion });

  const orgId = '00000000-0000-0000-0000-000000000001';
  console.log('[TEST 1] Running backfill for mock_provider...');
  const result = await orchestrator.runBackfill('mock_provider', orgId, { token: 'mock_token' });

  if (result.ingested === 2 && upsertedEvents.length === 2 && upsertedEvents[0].organizationId === orgId) {
    console.log(`PASS: Backfill completed successfully (${result.ingested} items ingested into org ${orgId}).`);
  } else {
    console.error('FAIL: Unexpected backfill result:', result);
    process.exit(1);
  }

  console.log('[TEST 2] Handling non-existent provider gracefully...');
  const emptyResult = await orchestrator.runBackfill('unknown_tool', orgId, {});
  if (emptyResult.ingested === 0 && emptyResult.failed === 0) {
    console.log('PASS: Non-existent provider safely skipped with 0 errors.');
  } else {
    console.error('FAIL: Non-existent provider handling failed:', emptyResult);
    process.exit(1);
  }

  console.log('\n=== BACKFILL ORCHESTRATOR TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
