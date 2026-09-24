/**
 * billingRoutes.js
 * Multi-Tenant Billing API Routes & Verified Webhook Handling — CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const stripeBillingService = require('../../../services/stripeBillingService');
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');

// El webhook de Stripe vivía aquí, en POST /webhooks/stripe, y no funcionaba por
// dos motivos independientes: app.js monta este router detrás de authMiddleware
// —y Stripe no envía JWT, así que sus eventos morían en 401— y su express.raw()
// se registraba después del express.json() global, con lo que la firma se
// validaba contra un cuerpo ya parseado. Se movió a routes/stripeWebhookRoutes.js,
// que app.js monta sin auth y antes del parser JSON.
//
// Todo lo que sigue son rutas de sesión: authMiddleware y tenantContextMiddleware
// se aplican aguas arriba, en app.js.
router.post('/create-checkout-session', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context missing' });

    const { plan, successUrl, cancelUrl } = req.body;
    const userEmail = req.user?.email || 'billing@organization.com';

    const result = await stripeBillingService.createCheckoutSession({
      organizationId: tenantId,
      userEmail,
      plan: plan || 'pro',
      successUrl,
      cancelUrl
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[billingRoutes] Checkout Session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-customer-portal', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context missing' });

    const { stripeCustomerId, returnUrl } = req.body;

    // Sin cliente de Stripe no hay portal que abrir. Antes se enviaba
    // 'cus_mock_customer', que Stripe rechaza: el error acababa siendo un 500
    // sobre un cliente inexistente en vez de un 400 sobre lo que falta.
    if (!stripeCustomerId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Falta stripeCustomerId: la organización aún no tiene cliente de facturación.'
      });
    }

    const result = await stripeBillingService.createCustomerPortal({
      organizationId: tenantId,
      stripeCustomerId,
      returnUrl
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[billingRoutes] Portal Session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscription', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context missing' });

    const supabase = dbDeUsuario(req, res);
    if (!supabase) return;   // dbDeUsuario ya respondió 401

    {
      const { data: sub, error } = await supabase
        .from('billing_subscriptions')
        .select('*')
        .eq('organization_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('[billingRoutes] Error leyendo la suscripción:', error.message);
        return res.status(500).json({ error: 'No se pudo consultar la suscripción' });
      }

      if (sub) {
        return res.json({
          success: true,
          subscription: {
            organizationId: sub.organization_id,
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end || false
          }
        });
      }
    }

    // Sin fila en billing_subscriptions no hay suscripción, y así se dice. Antes
    // se devolvía aquí un plan 'pro' activo con vencimiento a 30 días, sin marca
    // alguna de ser ficticio: una organización que nunca pagó veía plan de pago.
    res.json({ success: true, subscription: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context missing' });

    const supabase = dbDeUsuario(req, res);
    if (!supabase) return;   // dbDeUsuario ya respondió 401

    {
      const { data: invoices, error } = await supabase
        .from('billing_invoices')
        .select('*')
        .eq('organization_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[billingRoutes] Error leyendo las facturas:', error.message);
        return res.status(500).json({ error: 'No se pudieron consultar las facturas' });
      }

      const mapped = (invoices || []).map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number || inv.id,
        amountDue: inv.amount_due,
        currency: inv.currency || 'eur',
        status: inv.status,
        createdAt: inv.created_at,
        pdfUrl: inv.pdf_url || `/api/billing/invoices/${inv.id}/download`
      }));
      return res.json({ success: true, invoices: mapped });
    }

    // Una lista vacía es la respuesta honesta cuando no hay facturas. Antes se
    // devolvía una INV-2026-001 de 79 EUR marcada como pagada, indistinguible
    // de un cobro real para quien consumiera esta API.
    res.json({ success: true, invoices: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices/:id/download', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context missing' });

    // Esto devolvía Buffer.from('%PDF-1.4 %CoachData Official Invoice%'): 31 bytes
    // con cabecera application/pdf que ningún visor abre. El cliente recibía un
    // archivo corrupto presentado como su factura oficial.
    //
    // Las facturas reales las emite Stripe y su URL vive en billing_invoices.
    // pdf_url; mientras no se sirva desde ahí, esta ruta declara que no está
    // implementada en vez de entregar un archivo roto.
    res.status(501).json({
      error: 'Not Implemented',
      message: 'La descarga de facturas en PDF aún no está disponible. Use el enlace de la factura en Stripe.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
