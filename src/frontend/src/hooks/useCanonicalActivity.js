// src/frontend/src/hooks/useCanonicalActivity.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Fase 3 del pulpo: la cabeza empieza a leer del modelo canónico.
 * Trae los últimos pagos, formularios y contactos que han llegado de
 * CUALQUIER herramienta conectada (hoy: Stripe, Tally), ya traducidos a un
 * formato común. Añadir un tentáculo nuevo no toca este hook.
 *
 * Las sesiones NO van aquí: al coach le importan las que vienen, no las que
 * ya pasaron, así que tienen su propio hook (useUpcomingSessions).
 *
 * Aislamiento: RLS por organization_id, verificado contra la base real con
 * JWT de dos usuarios distintos (test-canonical-ingestion.js, 2026-08-12).
 * No hay filtro `.eq('organization_id', …)` aquí a propósito — RLS ya lo
 * hace, y añadirlo redundaría sin más seguridad.
 */
export function useCanonicalActivity(organizationId, { limit = 8 } = {}) {
  const [state, setState] = useState({ loading: true, error: null, events: [] });

  const load = useCallback(async () => {
    if (!organizationId) {
      setState({ loading: false, error: null, events: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [payments, forms, contacts] = await Promise.all([
        supabase
          .from('canonical_payment')
          .select('id, source_provider, amount_cents, currency, status, payer_name, payer_email, occurred_at')
          .eq('organization_id', organizationId)
          .order('occurred_at', { ascending: false })
          .limit(limit),
        supabase
          .from('canonical_form_entry')
          .select('id, source_provider, form_name, respondent_name, respondent_email, occurred_at')
          .eq('organization_id', organizationId)
          .order('occurred_at', { ascending: false })
          .limit(limit),
        supabase
          .from('canonical_contact')
          .select('id, source_provider, full_name, email, phone, occurred_at')
          .eq('organization_id', organizationId)
          .order('occurred_at', { ascending: false })
          .limit(limit),
      ]);

      if (payments.error) throw new Error(payments.error.message);
      if (forms.error) throw new Error(forms.error.message);
      if (contacts.error) throw new Error(contacts.error.message);

      const events = [
        ...(payments.data || []).map((p) => ({
          id: `payment-${p.id}`,
          type: 'payment',
          provider: p.source_provider,
          occurredAt: p.occurred_at,
          title: p.payer_name || p.payer_email || 'Pago recibido',
          detail: formatAmount(p.amount_cents, p.currency),
          status: p.status,
        })),
        ...(forms.data || []).map((f) => ({
          id: `form-${f.id}`,
          type: 'form_entry',
          provider: f.source_provider,
          occurredAt: f.occurred_at,
          title: f.respondent_name || f.respondent_email || 'Nueva respuesta',
          detail: f.form_name || '',
        })),
        ...(contacts.data || []).map((c) => ({
          id: `contact-${c.id}`,
          type: 'contact',
          provider: c.source_provider,
          occurredAt: c.occurred_at,
          title: c.full_name || c.email || 'Nuevo contacto',
          detail: c.email && c.full_name ? c.email : (c.phone || ''),
        })),
      ].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, limit);

      setState({ loading: false, error: null, events });
    } catch (err) {
      console.error('[useCanonicalActivity] Error cargando actividad canónica:', err);
      setState({ loading: false, error: err.message, events: [] });
    }
  }, [organizationId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function formatAmount(amountCents, currency) {
  if (typeof amountCents !== 'number') return '';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' })
      .format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency || ''}`;
  }
}
