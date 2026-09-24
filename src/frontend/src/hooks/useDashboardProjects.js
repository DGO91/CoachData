// src/frontend/src/hooks/useDashboardProjects.js
import { useState, useEffect, useMemo } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook para métricas de proyectos en el Dashboard Operativo.
 */
export function useDashboardProjects(organizationId) {
  const [rawProjects, setRawProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchProjects() {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('operations_projects')
          .select('*')
          .eq('organization_id', organizationId);

        if (!error && Array.isArray(data) && isMounted) {
          setRawProjects(data);
        } else if (isMounted) {
          setRawProjects([]);
        }
      } catch (err) {
        console.error('[useDashboardProjects] Error cargando proyectos:', err);
        if (isMounted) setRawProjects([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const metrics = useMemo(() => {
    const safeProjects = Array.isArray(rawProjects) ? rawProjects : [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeProjects = safeProjects.filter((p) => p && (p.status === 'active' || p.status === 'in_progress'));
    const pausedProjects = safeProjects.filter((p) => p && (p.status === 'paused' || p.status === 'on_hold'));
    const projectsWithoutRecentActivity = activeProjects.filter((p) => {
      const updatedAt = p.updated_at ? new Date(p.updated_at) : new Date(p.created_at);
      return updatedAt < sevenDaysAgo;
    });

    return {
      // Cero es un dato válido y se muestra como cero. El fallback anterior
      // (`|| ... : 1`) inventaba un proyecto activo cuando no había ninguno,
      // así que una cuenta recién creada veía "1 proyecto en curso" que no
      // existía en ninguna tabla.
      activeProjectsCount: activeProjects.length,
      pausedProjectsCount: pausedProjects.length,
      staleProjectsCount: projectsWithoutRecentActivity.length,
      rawProjects: safeProjects,
    };
  }, [rawProjects]);

  return {
    projects: metrics.rawProjects,
    activeProjectsCount: metrics.activeProjectsCount,
    pausedProjectsCount: metrics.pausedProjectsCount,
    staleProjectsCount: metrics.staleProjectsCount,
    loading,
  };
}
