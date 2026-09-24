// src/frontend/src/components/TaskActivityTimeline.jsx
import React, { useState, useEffect } from 'react';
import { getSupabase } from '../supabaseClient';

/**
 * TaskActivityTimeline — CoachData Operational OS v2
 * Muestra el historial en tiempo real de cambios en task_activity_history para una tarea dada.
 */
export function TaskActivityTimeline({ taskId, organizationId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let channel = null;

    async function loadHistoryAndSubscribe() {
      if (!taskId) {
        setLoading(false);
        return;
      }

      const supabase = await getSupabase();
      if (!supabase || !isMounted) {
        setLoading(false);
        return;
      }

      // 1. Carga inicial del historial
      try {
        const { data, error } = await supabase
          .from('task_activity_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data && isMounted) {
          setHistory(data);
        }
      } catch (err) {
        console.error('[TaskActivityTimeline] Error cargando historial:', err);
      } finally {
        if (isMounted) setLoading(false);
      }

      // 2. Suscripción Realtime a inserciones en task_activity_history
      channel = supabase
        .channel(`task-history-${taskId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_activity_history',
            filter: `task_id=eq.${taskId}`,
          },
          (payload) => {
            if (!isMounted) return;
            if (payload.new) {
              setHistory((prev) => [payload.new, ...prev]);
            }
          }
        )
        .subscribe();
    }

    loadHistoryAndSubscribe();

    return () => {
      isMounted = false;
      if (channel) channel.unsubscribe();
    };
  }, [taskId]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'hace un momento';
    if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
    return date.toLocaleDateString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderChanges = (item) => {
    const prev = item.previous_value || {};
    const curr = item.new_value || {};

    if (item.action_type === 'status_changed') {
      return `Estado: ${prev.status || 'N/A'} → ${curr.status || 'N/A'}`;
    }
    if (item.action_type === 'priority_changed') {
      return `Prioridad: ${prev.priority || 'N/A'} → ${curr.priority || 'N/A'}`;
    }
    if (item.action_type === 'assigned') {
      return `Asignado: ${curr.assigned_to || 'Sin asignar'}`;
    }
    if (item.action_type === 'created') {
      return `Tarea creada con estado ${curr.status || 'To do'}`;
    }
    if (item.action_type === 'deleted') {
      return 'Tarea eliminada';
    }
    return 'Detalles de la tarea actualizados';
  };

  if (loading) {
    return <div style={{ fontSize: '12px', color: '#94a3b8', padding: '8px 0' }}>Cargando historial...</div>;
  }

  return (
    <div className="task-activity-timeline" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '10px' }}>
        📜 Historial de Actividad
      </div>
      {history.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#64748b', italic: 'true' }}>Sin actividad registrada aún.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {history.map((item) => (
            <div
              key={item.id}
              style={{
                fontSize: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '8px 10px',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '2px' }}>
                <strong style={{ color: '#f1f5f9' }}>{item.actor_name || 'Usuario'}</strong>
                <span style={{ fontSize: '11px' }}>{formatTime(item.created_at)}</span>
              </div>
              <div style={{ color: '#cbd5e1' }}>{renderChanges(item)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
