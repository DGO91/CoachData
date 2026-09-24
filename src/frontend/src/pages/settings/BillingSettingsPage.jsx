import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Download, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNotifications } from '../../components/common/Notifications';

export default function BillingSettingsPage({ language = 'es' }) {
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [processing, setProcessing] = useState(false);

  const locale = language === 'es' ? 'es-ES' : 'en-US';

  // /api/billing exige sesion + contexto de organizacion (authMiddleware,
  // tenantContextMiddleware en app.js); sin estas cabeceras responde 401/403.
  const authHeaders = useCallback(async (extra = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-organization-slug': localStorage.getItem('coachdata_org_slug') || 'default',
      ...extra,
    };
  }, []);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const headers = await authHeaders();
      const [subRes, invRes] = await Promise.all([
        fetch('/api/billing/subscription', { headers }),
        fetch('/api/billing/invoices', { headers }),
      ]);
      if (!subRes.ok || !invRes.ok) throw new Error(`HTTP ${subRes.status}/${invRes.status}`);
      const subData = await subRes.json();
      const invData = await invRes.json();
      setSubscription(subData.subscription || null);
      setInvoices(Array.isArray(invData.invoices) ? invData.invoices : []);
    } catch (err) {
      console.error('[BillingSettingsPage] Failed to load billing data:', err);
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  // Las facturas se pintaban con la fecha ISO cruda ("2026-08-07").
  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };

  // El backend devuelve amountDue en centimos (7900 = 79.00).
  const formatAmount = (value, currency = 'eur') => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency.toUpperCase() }).format(value / 100);
    }
    return value ?? '—';
  };

  const handleCheckout = async (planKey) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan: planKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.url) {
        window.location.href = data.url;
      } else {
        notify(language === 'es' ? 'Stripe no devolvió una URL de checkout.' : 'Stripe did not return a checkout URL.', { type: 'error' });
      }
    } catch (err) {
      console.error('[BillingSettingsPage] Checkout error:', err);
      notify(language === 'es' ? 'No se pudo iniciar el checkout de Stripe.' : 'Could not start Stripe checkout.', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenPortal = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/billing/create-customer-portal', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.url) {
        window.location.href = data.url;
      } else {
        notify(language === 'es' ? 'Stripe no devolvió una URL del portal.' : 'Stripe did not return a portal URL.', { type: 'error' });
      }
    } catch (err) {
      console.error('[BillingSettingsPage] Portal error:', err);
      notify(language === 'es' ? 'No se pudo abrir el portal de Stripe.' : 'Could not open the Stripe portal.', { type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-24 text-textMuted text-sm">
        {language === 'es' ? 'Cargando facturación…' : 'Loading billing…'}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-3 py-24 text-center">
        <AlertCircle size={28} className="text-[var(--danger)]" />
        <p className="text-sm text-textMuted">
          {language === 'es' ? 'No se pudo cargar la facturación.' : 'Could not load billing data.'}
        </p>
        <button
          type="button"
          onClick={fetchBilling}
          className="px-4 py-2 bg-bgMuted border border-borderColor text-textMain rounded-lg text-xs font-semibold hover:bg-bgSurface transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={14} />
          {language === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 animate-fade-in pt-6 pb-20">
      {/* HEADER */}
      <div className="glass-panel-inner p-6 flex items-center justify-between gap-4 border border-borderColor rounded-xl bg-bgSurface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-bgMuted flex items-center justify-center text-[var(--accent)] border border-borderColor">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-textMain tracking-tight">
              {language === 'es' ? 'Facturación y Suscripción' : 'Billing & Subscriptions'}
            </h1>
            <p className="text-xs text-textMuted mt-0.5">
              {language === 'es' ? 'Gestiona el plan de tu organización, métodos de pago y facturación con Stripe.' : 'Manage your organization plan, payment methods, and Stripe billing.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenPortal}
          disabled={processing}
          className="px-4 py-2 bg-bgMuted border border-borderColor text-textMain rounded-lg text-xs font-semibold hover:bg-bgSurface transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          {language === 'es' ? 'Stripe Portal' : 'Stripe Portal'}
        </button>
      </div>

      {/* CURRENT PLAN & PAYMENT METHOD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel-inner p-6 flex flex-col gap-4 border border-borderColor rounded-xl bg-bgSurface">
          <div className="flex items-center justify-between border-b border-borderColor pb-3">
            <h3 className="font-bold text-textMain text-base flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--accent)]" />
              {language === 'es' ? 'Plan Activo' : 'Active Plan'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/30">
              {(subscription?.status || 'unknown').toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xl font-bold text-textMain capitalize">{subscription?.plan || '—'}</span>
            <span className="text-xs text-textMuted">
              {subscription?.cancelAtPeriodEnd
                ? (language === 'es' ? `Se cancela el ${formatDate(subscription?.currentPeriodEnd)}` : `Cancels on ${formatDate(subscription?.currentPeriodEnd)}`)
                : (language === 'es' ? `Renovación automática el ${formatDate(subscription?.currentPeriodEnd)}` : `Auto-renews on ${formatDate(subscription?.currentPeriodEnd)}`)}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleCheckout('pro')}
              disabled={processing}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-text)] rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {language === 'es' ? 'Cambiar de Plan' : 'Change Plan'}
            </button>
          </div>
        </div>

        <div className="glass-panel-inner p-6 flex flex-col gap-4 border border-borderColor rounded-xl bg-bgSurface">
          <div className="flex items-center justify-between border-b border-borderColor pb-3">
            <h3 className="font-bold text-textMain text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--accent)]" />
              {language === 'es' ? 'Método de Pago' : 'Payment Method'}
            </h3>
          </div>

          <div className="flex items-center gap-3 p-3 bg-bgMuted border border-borderColor rounded-lg">
            <CreditCard size={24} className="text-textMain" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-textMain">
                {language === 'es' ? 'Gestionado en Stripe' : 'Managed in Stripe'}
              </span>
              <span className="text-[10px] text-textMuted">
                {language === 'es' ? 'Los últimos 4 dígitos y la fecha de expiración se ven en el portal.' : 'Card details and expiry are visible inside the portal.'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenPortal}
            className="text-xs font-semibold text-[var(--accent)] hover:underline self-start mt-1"
          >
            {language === 'es' ? 'Actualizar método de pago en Stripe →' : 'Update payment method in Stripe →'}
          </button>
        </div>
      </div>

      {/* INVOICES LIST */}
      <div className="glass-panel-inner p-6 flex flex-col gap-4 border border-borderColor rounded-xl bg-bgSurface">
        <h3 className="font-bold text-textMain text-base border-b border-borderColor pb-3">
          {language === 'es' ? 'Historial de Facturas' : 'Billing History & Invoices'}
        </h3>

        {invoices.length === 0 ? (
          <p className="text-xs text-textMuted py-4 text-center">
            {language === 'es' ? 'Todavía no hay facturas.' : 'No invoices yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-bgMuted border border-borderColor rounded-lg text-xs">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-textMain">{inv.invoiceNumber}</span>
                  <span className="text-textMuted">{formatDate(inv.createdAt)}</span>
                  <span className="font-bold text-textMain">{formatAmount(inv.amountDue, inv.currency)}</span>
                </div>
                <a
                  href={inv.pdfUrl || '#'}
                  download
                  className="px-3 py-1.5 bg-bgSurface hover:bg-bgMuted border border-borderColor text-textMain rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} />
                  PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
