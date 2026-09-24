// src/frontend/src/hooks/useOperationsTasks.js
import { useCallback } from 'react';
import { useRealtimeTasks } from './useRealtimeTasks';
import { getSupabase } from '../supabaseClient';

/**
 * Custom Hook principal para Operations Hub (Project Desk).
 * Expone la API { tasks, loading, createTask, updateTask, deleteTask }
 * e integra registro no bloqueante en task_activity_history con JSONB.
 */
export function useOperationsTasks(organizationId = null) {
  const { tasks = [], setTasks, loading } = useRealtimeTasks(organizationId);
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Helper no bloqueante para registrar en task_activity_history
  const logActivity = useCallback(async (activityData) => {
    try {
      const supabase = await getSupabase();
      if (!supabase) return;

      const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: null }));
      const currentUser = authData?.user;
      const userName = localStorage.getItem('coachdata-user-name') || currentUser?.email?.split('@')[0] || 'Unknown User';

      const payload = {
        task_id: activityData.task_id,
        actor_id: currentUser?.id || null,
        actor_name: userName,
        action_type: activityData.action_type,
        field_name: activityData.field_name || null,
        previous_value: activityData.previous_value || null,
        new_value: activityData.new_value || null,
        metadata_json: activityData.metadata_json || {},
        organization_id: organizationId
      };

      await supabase.from('task_activity_history').insert([payload]);
    } catch (err) {
      console.warn('[useOperationsTasks] Non-blocking activity log failed:', err.message);
    }
  }, [organizationId]);

  // CREATE TASK: Inserción optimista en cliente + insert real en Supabase
  const createTask = useCallback(async (taskInput) => {
    const tempId = `temp-${Date.now()}`;
    const newTask = {
      id: tempId,
      title: taskInput.title || 'Nueva Tarea',
      description: taskInput.description || '',
      status: taskInput.status || 'todo',
      priority: taskInput.priority || 'medium',
      project_id: taskInput.project_id || null,
      due_date: taskInput.due_date || null,
      organization_id: organizationId,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...(Array.isArray(prev) ? prev : [])]);

    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase client unavailable');

      const { data, error } = await supabase
        .from('operations_tasks')
        .insert([{
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          project_id: newTask.project_id,
          due_date: newTask.due_date,
          organization_id: organizationId
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) => (Array.isArray(prev) ? prev.map((t) => (t.id === tempId ? data : t)) : [data]));

      logActivity({
        task_id: data.id,
        action_type: 'created',
        metadata_json: { source: 'useOperationsTasks', initial_status: data.status }
      });

      return data;
    } catch (err) {
      console.error('[useOperationsTasks] Error creating task:', err);
      setTasks((prev) => (Array.isArray(prev) ? prev.filter((t) => t.id !== tempId) : []));
      throw err;
    }
  }, [organizationId, setTasks, logActivity]);

  // UPDATE TASK: Actualización optimista + update real en Supabase + log de auditoría
  const updateTask = useCallback(async (taskId, updates) => {
    let previousTask = null;

    setTasks((prev) => {
      if (!Array.isArray(prev)) return [];
      return prev.map((t) => {
        if (t.id === taskId) {
          previousTask = { ...t };
          return { ...t, ...updates };
        }
        return t;
      });
    });

    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase client unavailable');

      const { data, error } = await supabase
        .from('operations_tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      if (previousTask) {
        if (updates.status && updates.status !== previousTask.status) {
          logActivity({
            task_id: taskId,
            action_type: 'status_changed',
            field_name: 'status',
            previous_value: previousTask.status,
            new_value: updates.status,
            metadata_json: { updated_fields: Object.keys(updates) }
          });
        } else {
          logActivity({
            task_id: taskId,
            action_type: 'updated',
            field_name: Object.keys(updates).join(', '),
            previous_value: JSON.stringify(previousTask),
            new_value: JSON.stringify(updates),
            metadata_json: { updated_fields: Object.keys(updates) }
          });
        }
      }

      return data;
    } catch (err) {
      console.error('[useOperationsTasks] Error updating task:', err);
      if (previousTask) {
        setTasks((prev) => (Array.isArray(prev) ? prev.map((t) => (t.id === taskId ? previousTask : t)) : []));
      }
      throw err;
    }
  }, [organizationId, setTasks, logActivity]);

  // DELETE TASK: Eliminación optimista + delete real en Supabase
  const deleteTask = useCallback(async (taskId) => {
    let deletedTask = null;

    setTasks((prev) => {
      if (!Array.isArray(prev)) return [];
      deletedTask = prev.find((t) => t.id === taskId);
      return prev.filter((t) => t.id !== taskId);
    });

    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('Supabase client unavailable');

      const { error } = await supabase
        .from('operations_tasks')
        .delete()
        .eq('id', taskId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      if (deletedTask) {
        logActivity({
          task_id: taskId,
          action_type: 'deleted',
          metadata_json: { deleted_title: deletedTask.title }
        });
      }
    } catch (err) {
      console.error('[useOperationsTasks] Error deleting task:', err);
      if (deletedTask) {
        setTasks((prev) => (Array.isArray(prev) ? [...prev, deletedTask] : [deletedTask]));
      }
      throw err;
    }
  }, [organizationId, setTasks, logActivity]);

  return {
    tasks: safeTasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
  };
}
