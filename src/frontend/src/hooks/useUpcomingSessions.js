// src/frontend/src/hooks/useUpcomingSessions.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Fase 3 del pulpo — sesiones.
 *
 * A diferencia de pagos, formularios y contactos (que se miran hacia atrás:
 * «qué ha llegado»), una sesión importa hacia delante: lo que el coach
 * necesita saber es qué tiene por delante hoy y esta semana. Por eso esto no
 * vive en useCanonicalActivity: se ordena por `starts_at` ASCENDENTE y se
 * filtran las que ya han pasado.
 *
 * Da igual si la sesión viene de Calendly, Google Calendar o de lo que el
 * coach use mañana: llega ya traducida a `canonical_session`.
 *
 * Aislamiento: RLS por organization_id (verificado con JWT real en
 * test-canonical-ingestion.js). Sin `.eq()` redundante, igual que el resto.
 */
export function useUpcomingSessions(organizationId, { limit = 5 } = {}) {
  const [state, setState] = useState({ loading: true, error: null, sessions: [] });

  const load = useCallback(async () => {
    if (!organizationId) {
      setState({ loading: false, error: null, sessions: [] });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Margen de 1 hora hacia atrás: una sesión que empezó hace 20 minutos
      // sigue siendo relevante (probablemente está ocurriendo ahora mismo).
      const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('canonical_session')
        .select('id, source_provider, starts_at, ends_at, attendee_name, attendee_email, session_type')
        .eq('organization_id', organizationId)
        .gte('starts_at', desde)
        .order('starts_at', { ascending: true })
        .limit(limit);

      if (error) throw new Error(error.message);

      setState({
        loading: false,
        error: null,
        sessions: (data || []).map((s) => ({
          id: s.id,
          provider: s.source_provider,
          startsAt: s.starts_at,
          endsAt: s.ends_at,
          who: s.attendee_name || s.attendee_email || 'Sin nombre',
          email: s.attendee_email || '',
          type: s.session_type || '',
        })),
      });
    } catch (err) {
      console.error('[useUpcomingSessions] Error cargando sesiones:', err);
      setState({ loading: false, error: err.message, sessions: [] });
    }
  }, [organizationId, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
