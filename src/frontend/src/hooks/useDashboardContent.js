// src/frontend/src/hooks/useDashboardContent.js
import { useState, useEffect, useMemo } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * Hook para métricas de piezas de contenido Growth en el Dashboard.
 */
export function useDashboardContent(organizationId) {
  const [rawContent, setRawContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchContent() {
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
          .from('growth_content')
          .select('*')
          .eq('organization_id', organizationId);

        if (!error && Array.isArray(data) && isMounted) {
          setRawContent(data);
        } else if (isMounted) {
          setRawContent([]);
        }
      } catch (err) {
        console.error('[useDashboardContent] Error cargando contenido:', err);
        if (isMounted) setRawContent([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchContent();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const metrics = useMemo(() => {
    const safeContent = Array.isArray(rawContent) ? rawContent : [];
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const scheduledNext30Days = safeContent.filter((c) => {
      if (!c || !c.scheduled_date) return false;
      const scheduled = new Date(c.scheduled_date);
      return scheduled >= now && scheduled <= thirtyDaysAhead;
    });

    const draftContent = safeContent.filter((c) => c && (c.status === 'Ideas' || c.status === 'Draft'));
    const publishedThisWeek = safeContent.filter((c) => {
      if (!c || c.status !== 'Published') return false;
      const createdAt = new Date(c.created_at);
      return createdAt >= sevenDaysAgo;
    });

    return {
      scheduledNext30DaysCount: scheduledNext30Days.length,
      draftContentCount: draftContent.length,
      publishedThisWeekCount: publishedThisWeek.length,
      rawContent: safeContent,
    };
  }, [rawContent]);

  return {
    contentItems: metrics.rawContent,
    scheduledNext30DaysCount: metrics.scheduledNext30DaysCount,
    draftContentCount: metrics.draftContentCount,
    publishedThisWeekCount: metrics.publishedThisWeekCount,
    loading,
  };
}
