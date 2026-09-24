// src/frontend/src/hooks/usePipelineAnalytics.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Vocabulario real de la base, no inventado:
// - crm_contacts.status: 'new' por defecto (008), pasa a 'qualified' en
//   AutomationDispatcher (lead_qualification).
// - proposals.status: draft, sent, viewed, approved, rejected, converted (013).
// - crm_deals.stage: 'lead' por defecto (008), etapas configurables por org.
const APPROVED_PROPOSAL_STATUSES = ['approved', 'converted'];
const CLOSED_DEAL_STAGES = ['won', 'lost', 'closed', 'closed_won', 'closed_lost'];

/**
 * Resuelve la organización activa igual que LeadHub: primero por el slug
 * guardado en localStorage, y si no hay, por la primera membresía del usuario.
 * Devuelve null si no se puede determinar — en ese caso no se consulta nada,
 * porque una consulta sin organización devolvería datos que no son del coach.
 */
async function resolveOrganizationId() {
  const orgSlug = localStorage.getItem('coachdata_org_slug');

  if (orgSlug && orgSlug !== 'default') {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .limit(1)
    .maybeSingle();

  return membership?.organization_id || null;
}

/**
 * Cuenta filas sin traérselas. Si Supabase no devuelve un número, se trata como
 * fallo y no como cero: un cero inventado es indistinguible de un cero real.
 */
async function countRows(query) {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  if (typeof count !== 'number') throw new Error('La consulta no devolvió un conteo');
  return count;
}

/**
 * Métricas del pipeline calculadas contra las tablas reales del CRM.
 * Todo lo que no se puede derivar de la base (horas ahorradas, tiempo medio de
 * cierre) no se muestra: no hay ninguna columna que lo registre.
 */
export function usePipelineAnalytics() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    metrics: null,
    hasAnyData: false,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const organizationId = await resolveOrganizationId();
      if (!organizationId) {
        setState({
          loading: false,
          error: null,
          metrics: null,
          hasAnyData: false,
        });
        return;
      }

      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
      const scoped = (table) =>
        supabase.from(table).select('*', { count: 'exact', head: true }).eq('organization_id', organizationId);

      const [
        leadsLast30d,
        leadsTotal,
        leadsQualified,
        callsRecorded,
        sessionsRecorded,
        canonicalPaymentsTotal,
        proposalsTotal,
        proposalsApproved,
        dealsResult,
      ] = await Promise.all([
        countRows(scoped('crm_contacts').gte('created_at', cutoff)),
        countRows(scoped('crm_contacts')),
        countRows(scoped('crm_contacts').eq('status', 'qualified')),
        countRows(scoped('call_sessions')),
        countRows(scoped('canonical_session')),
        countRows(scoped('canonical_payment')),
        countRows(scoped('proposals')),
        countRows(scoped('proposals').in('status', APPROVED_PROPOSAL_STATUSES)),
        supabase
          .from('crm_deals')
          .select('value, stage, currency')
          .eq('organization_id', organizationId),
      ]);

      if (dealsResult.error) throw new Error(dealsResult.error.message);

      const deals = dealsResult.data || [];
      const openDeals = deals.filter((d) => !CLOSED_DEAL_STAGES.includes(String(d.stage || '').toLowerCase()));
      const pipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
      const currency = openDeals.find((d) => d.currency)?.currency || 'EUR';

      const hasAnyData =
        leadsTotal > 0 || callsRecorded > 0 || sessionsRecorded > 0 || canonicalPaymentsTotal > 0 || proposalsTotal > 0 || deals.length > 0;

      setState({
        loading: false,
        error: null,
        hasAnyData,
        metrics: {
          leadsLast30d,
          leadsTotal,
          leadsQualified,
          callsRecorded,
          sessionsRecorded,
          canonicalPaymentsTotal,
          proposalsTotal,
          proposalsApproved,
          openDealsCount: openDeals.length,
          pipelineValue,
          currency,
          // null (no 0%) cuando no hay leads: sin denominador no hay tasa.
          qualificationRate: leadsTotal > 0 ? (leadsQualified / leadsTotal) * 100 : null,
        },
      });
    } catch (err) {
      console.error('[usePipelineAnalytics] Error cargando métricas:', err);
      setState({
        loading: false,
        error: err.message || 'No se pudieron cargar las métricas',
        metrics: null,
        hasAnyData: false,
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
