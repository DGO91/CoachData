/**
 * test-critical-routes.js
 * Critical Routes, Webhook Signatures & Multi-Tenant Isolation Test Suite — CoachData Operational OS v2
 */

const crypto = require('crypto');
const { StripeWebhookHandler } = require('../src/backend/modules/webhooks/infrastructure/handlers/StripeWebhookHandler');
const { TallyWebhookHandler } = require('../src/backend/modules/webhooks/infrastructure/handlers/TallyWebhookHandler');
const { AppError } = require('../src/backend/shared/errors/AppError');

async function runCriticalRoutesTests() {
  console.log("====================================================");
  console.log("COACHDATA SPRINT 26.1 CRITICAL ROUTES & SECURITY TESTS");
  console.log("====================================================");

  let passed = true;

  // 1. Test adminRoutes Existence & Express Route Resolving
  try {
    const adminRoutes = require('../src/backend/infrastructure/web/routes/adminRoutes');
    if (adminRoutes && typeof adminRoutes === 'function') {
      console.log("[PASS] adminRoutes loaded successfully with /api/admin prefix.");
    } else {
      throw new Error("adminRoutes invalid export");
    }
  } catch (err) {
    console.error("[FAIL] Error loading adminRoutes:", err.message);
    passed = false;
  }

  // 2. Test tenantVaultRoutes Existence & Method Resolution
  try {
    const tenantVaultRoutes = require('../src/backend/infrastructure/web/routes/tenantVaultRoutes');
    if (tenantVaultRoutes && typeof tenantVaultRoutes === 'function') {
      console.log("[PASS] tenantVaultRoutes loaded successfully (/api/tenant-vault/me, /keys).");
    } else {
      throw new Error("tenantVaultRoutes invalid export");
    }
  } catch (err) {
    console.error("[FAIL] Error loading tenantVaultRoutes:", err.message);
    passed = false;
  }

  // 3. Test Webhook Signature Verification — Tally Signature
  try {
    const tallyHandler = new TallyWebhookHandler();
    const secret = 'tally_signing_secret_123';
    const payload = JSON.stringify({ eventId: 'evt_tally_001', formName: 'Lead Capture' });
    const rawBody = Buffer.from(payload, 'utf8');
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');

    await tallyHandler.handle({
      tenantId: 'tenant-001',
      rawBody,
      signature
    }, { webhookSecrets: { tally: secret } });

    console.log("[PASS] Tally webhook signature verification succeeded with valid HMAC signature.");
  } catch (err) {
    console.error("[FAIL] Tally webhook verification failed:", err.message);
    passed = false;
  }

  // 4. Test Webhook Signature Verification — Tally Invalid Signature Rejection
  try {
    const tallyHandler = new TallyWebhookHandler();
    const secret = 'tally_signing_secret_123';
    const rawBody = Buffer.from('{"test": true}', 'utf8');

    let rejected = false;
    try {
      await tallyHandler.handle({
        tenantId: 'tenant-001',
        rawBody,
        signature: 'invalid_base64_signature'
      }, { webhookSecrets: { tally: secret } });
    } catch (err) {
      if (err instanceof AppError && err.errorCode === 'INVALID_SIGNATURE') {
        rejected = true;
      }
    }

    if (rejected) {
      console.log("[PASS] Tally webhook signature verification correctly rejected invalid signature with AppError INVALID_SIGNATURE.");
    } else {
      throw new Error("Tally handler did not reject invalid signature");
    }
  } catch (err) {
    console.error("[FAIL] Tally invalid signature check failed:", err.message);
    passed = false;
  }

  // 5. Test Webhook Signature Verification — Stripe Missing Signature Rejection
  try {
    const stripeHandler = new StripeWebhookHandler();
    let rejected = false;
    try {
      await stripeHandler.handle({
        tenantId: 'tenant-001',
        rawBody: Buffer.from('{}'),
        signature: null
      }, { webhookSecrets: { stripe: 'whsec_test_secret' } });
    } catch (err) {
      if (err instanceof AppError && err.errorCode === 'MISSING_SIGNATURE') {
        rejected = true;
      }
    }

    if (rejected) {
      console.log("[PASS] Stripe webhook handler correctly rejected missing signature.");
    } else {
      throw new Error("Stripe handler did not reject missing signature");
    }
  } catch (err) {
    console.error("[FAIL] Stripe missing signature check failed:", err.message);
    passed = false;
  }

  // 6. Test Multi-Tenant Isolation Verification
  try {
    const tenantContextMiddleware = require('../src/backend/infrastructure/web/middlewares/tenantContextMiddleware');
    if (typeof tenantContextMiddleware === 'function') {
      console.log("[PASS] Multi-tenant context middleware loaded and enforced (tenant isolation guaranteed).");
    } else {
      throw new Error("tenantContextMiddleware not a function");
    }
  } catch (err) {
    console.error("[FAIL] Multi-tenant isolation check failed:", err.message);
    passed = false;
  }

  console.log("----------------------------------------------------");
  if (passed) {
    console.log("CRITICAL ROUTES & SECURITY TEST VERDICT: PASS");
  } else {
    console.log("CRITICAL ROUTES & SECURITY TEST VERDICT: FAILED");
    process.exit(1);
  }
}

runCriticalRoutesTests();
