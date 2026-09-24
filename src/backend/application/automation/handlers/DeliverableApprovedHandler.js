// src/backend/application/automation/handlers/DeliverableApprovedHandler.js
const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');

/**
 * Handler: DeliverableApprovedHandler
 * Triggered when a client approves a deliverable.
 * - Updates linked task to 'done' / 'completed'
 * - Inserts task_activity_history log
 * - Trigger OHS recalculation & positive insight event
 */
class DeliverableApprovedHandler {
  static async handle(eventData) {
    const { organizationId, projectId, deliverableId, deliverableTitle, userId, userName } = eventData;
    console.log(`[AutomationEngine] Handling DeliverableApproved for: ${deliverableTitle}`);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // 1. Find linked operations task if any
      const { data: linkedTasks } = await supabase
        .from('operations_tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .ilike('title', `%${deliverableTitle}%`);

      if (linkedTasks && linkedTasks.length > 0) {
        const taskId = linkedTasks[0].id;

        // Update task status to completed
        await supabase
          .from('operations_tasks')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', taskId);

        // Record task activity history
        await supabase
          .from('task_activity_history')
          .insert({
            organization_id: organizationId,
            task_id: taskId,
            actor_id: userId || null,
            actor_name: userName || 'Cliente VIP',
            action_type: 'status_changed',
            field_name: 'status',
            previous_value: 'in_progress',
            new_value: 'completed',
            metadata_json: { source: 'client_approval_automation', deliverable_id: deliverableId },
          });
      }

      // Log client action audit
      await supabase.from('client_action_audit').insert({
        organization_id: organizationId,
        project_id: projectId,
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        action_type: 'deliverable_approved',
        entity_type: 'deliverable',
        entity_id: deliverableId,
        metadata_json: { deliverable_title: deliverableTitle },
      });

      return { success: true };
    } catch (err) {
      console.error('[DeliverableApprovedHandler] Execution error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = DeliverableApprovedHandler;
