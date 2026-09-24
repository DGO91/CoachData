// src/backend/services/stripeInvoiceService.js
// Native Stripe Invoicing Integration sourcing keys from Security Vault

const Stripe = require('stripe');
const { getSupabaseClient } = require('../infrastructure/database/supabaseClient');
const { decrypt } = require('../infrastructure/services/encryptionService');

/**
 * Retrieve Stripe private API key safely from Security Vault for a tenant.
 */
async function getStripeApiKey(tenantId) {
  const supabase = getSupabaseClient();
  if (!supabase) return process.env.STRIPE_API_KEY || null;

  const { data: record, error } = await supabase
    .from('client_provider_keys')
    .select('api_key_encrypted')
    .eq('tenant_id', tenantId)
    .eq('provider_name', 'stripe_key')
    .maybeSingle();

  if (error || !record || !record.api_key_encrypted) {
    // Try fallback
    return process.env.STRIPE_API_KEY || null;
  }

  try {
    return decrypt(record.api_key_encrypted);
  } catch (err) {
    console.error('[StripeInvoiceService] Decryption failed:', err.message);
    return null;
  }
}

/**
 * Create a Stripe customer and draft invoice for proposal.
 * Returns created stripe invoice details.
 */
async function createDraftInvoice(tenantId, { clientName, clientEmail, clientCompany, amount, currency = 'EUR', description = '' }) {
  const apiKey = await getStripeApiKey(tenantId);
  if (!apiKey) {
    throw new Error('Stripe private API key not configured in Security Vault');
  }

  const stripe = new Stripe(apiKey, { apiVersion: '2023-10-16' });

  // 1. Find or create Stripe Customer
  let customer;
  const customers = await stripe.customers.list({ email: clientEmail, limit: 1 });
  if (customers.data.length > 0) {
    customer = customers.data[0];
  } else {
    customer = await stripe.customers.create({
      name: clientName,
      email: clientEmail,
      description: clientCompany
    });
  }

  // 2. Create Invoice Item
  const cleanAmount = Math.round(parseFloat(amount.replace(/[^0-9.]/g, '')) * 100); // convert to cents
  await stripe.invoiceItems.create({
    customer: customer.id,
    amount: cleanAmount || 450000, // fallback to 4500 EUR cents if parse fails
    currency: currency.toLowerCase(),
    description: description || 'Consultoría de Operaciones y Growth'
  });

  // 3. Create Draft Invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    auto_advance: false, // leave as draft for human review
    collection_method: 'send_invoice',
    due_date: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 days from now
  });

  return {
    stripeInvoiceId: invoice.id,
    invoicePdf: invoice.invoice_pdf,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    amount: (invoice.amount_due / 100).toFixed(2),
    currency: invoice.currency.toUpperCase()
  };
}

module.exports = {
  createDraftInvoice,
  getStripeApiKey
};
