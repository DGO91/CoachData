// src/frontend/src/hooks/useActiveOrganizationId.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Resuelve la organización activa del usuario que ha iniciado sesión: primero
 * por el slug guardado en localStorage (`coachdata_org_slug`), y si no hay, por
 * su primera membresía real. Mismo patrón ya verificado en LeadHub y
 * usePipelineAnalytics — centralizado aquí para no triplicarlo una cuarta vez.
 *
 * Existe porque el Dashboard principal (OperationalGoldDashboard) se montaba
 * con un organizationId por defecto que no corresponde a ninguna fila de
 * `organizations`: cada panel quedaba vacío para cualquier coach real, no por
 * falta de datos sino porque preguntaba por una organización que no existe.
 */
export function useActiveOrganizationId() {
  const [organizationId, setOrganizationId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const orgSlug = localStorage.getItem('coachdata_org_slug');

      if (orgSlug && orgSlug !== 'default') {
        const { data } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .maybeSingle();
        if (!cancelled && data?.id) {
          setOrganizationId(data.id);
          setLoading(false);
          return;
        }
      }

      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setOrganizationId(membership?.organization_id || null);
        setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, []);

  return { organizationId, loading };
}
