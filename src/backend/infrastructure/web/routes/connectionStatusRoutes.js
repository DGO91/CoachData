'use strict';

const express = require('express');
const router = express.Router();
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
const { ConnectorRegistry } = require('../../../modules/integrations/application/ConnectorRegistry');
const { IngestionDispatcher } = require('../../../modules/integrations/application/IngestionDispatcher');
const { BackfillOrchestrator } = require('../../../modules/integrations/application/BackfillOrchestrator');
const { SupabaseCanonicalRepository } = require('../../../modules/integrations/infrastructure/repositories/SupabaseCanonicalRepository');
const { getDecryptedTenantKeys } = require('../../../application/credentials/credentialsUseCase');

const { StripeConnector } = require('../../../modules/integrations/infrastructure/connectors/StripeConnector');
const { CalendlyConnector } = require('../../../modules/integrations/infrastructure/connectors/CalendlyConnector');
const { TallyConnector } = require('../../../modules/integrations/infrastructure/connectors/TallyConnector');
const { KajabiConnector } = require('../../../modules/integrations/infrastructure/connectors/KajabiConnector');
const { WhatsAppCloudConnector } = require('../../../modules/integrations/infrastructure/connectors/WhatsAppCloudConnector');
// Lector por Nango: trae los datos de las herramientas conectadas por OAuth.
const { NangoConnector } = require('../../../modules/integrations/infrastructure/connectors/NangoConnector');

/**
 * GET /api/integrations/status
 * Returns connection health and ingested entity counts per provider for the authenticated organization.
 */
router.get('/status', async (req, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }

  const supabase = dbDeUsuario(req, res);
  if (!supabase) return;   // dbDeUsuario ya respondió 401

  try {
    const registry = new ConnectorRegistry()
      .register(new StripeConnector())
      .register(new CalendlyConnector())
      .register(new TallyConnector())
      .register(new KajabiConnector())
      .register(new WhatsAppCloudConnector())
      .register(new NangoConnector('hubspot'));

    // Fetch keys for this tenant
    const { data: keys } = await supabase
      .from('client_provider_keys')
      .select('provider_name, provider_type, updated_at')
      .eq('tenant_id', tenantId);

    const activeKeys = keys || [];
    const connectedProviders = activeKeys.map(k => k.provider_name);

    // Count entities in canonical tables for this tenant
    const [contactsRes, paymentsRes, sessionsRes, formsRes] = await Promise.all([
      supabase.from('canonical_contact').select('source_provider', { count: 'exact' }).eq('organization_id', tenantId),
      supabase.from('canonical_payment').select('source_provider', { count: 'exact' }).eq('organization_id', tenantId),
      supabase.from('canonical_session').select('source_provider', { count: 'exact' }).eq('organization_id', tenantId),
      supabase.from('canonical_form_entry').select('source_provider', { count: 'exact' }).eq('organization_id', tenantId),
    ]);

    const stats = {
      contacts: contactsRes.count || 0,
      payments: paymentsRes.count || 0,
      sessions: sessionsRes.count || 0,
      forms: formsRes.count || 0,
    };

    const providersStatus = registry.listProviders().map(providerId => {
      const isConnected = connectedProviders.includes(providerId);
      const keyInfo = activeKeys.find(k => k.provider_name === providerId);
      return {
        id: providerId,
        connected: isConnected,
        lastUpdated: keyInfo?.updated_at || null,
      };
    });

    res.json({
      success: true,
      organizationId: tenantId,
      stats,
      providers: providersStatus,
    });
  } catch (err) {
    console.error('[ConnectionStatusRoutes] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/integrations/trigger-backfill
 * Manually trigger historical data import for a provider.
 */
router.post('/trigger-backfill', async (req, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant context required' });
  }

  const { providerId, sinceDays } = req.body;
  if (!providerId) {
    return res.status(400).json({ error: 'providerId is required' });
  }

  const supabase = dbDeUsuario(req, res);
  if (!supabase) return;   // dbDeUsuario ya respondió 401

  try {
    const registry = new ConnectorRegistry()
      .register(new StripeConnector())
      .register(new CalendlyConnector())
      .register(new TallyConnector())
      .register(new KajabiConnector())
      .register(new WhatsAppCloudConnector())
      .register(new NangoConnector('hubspot'));

    const decryptedKeys = await getDecryptedTenantKeys(tenantId);
    const repo = new SupabaseCanonicalRepository(supabase);
    const ingestion = new IngestionDispatcher({ canonicalRepository: repo });
    const orchestrator = new BackfillOrchestrator({ connectorRegistry: registry, ingestionDispatcher: ingestion });

    const sinceDate = new Date(Date.now() - (sinceDays || 90) * 24 * 60 * 60 * 1000);
    const result = await orchestrator.runBackfill(providerId, tenantId, decryptedKeys, { since: sinceDate });

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[ConnectionStatusRoutes] Backfill error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
