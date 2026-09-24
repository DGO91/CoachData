// src/backend/application/automation/handlers/DeliverableRevisionHandler.js
const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');

/**
 * Handler: DeliverableRevisionHandler
 * Triggered when a client requests revisions on a deliverable.
 * - Updates linked task to 'in_progress'
 * - Records revision comment & audit log
 * - Generates an operational alert for executive panels
 */
class DeliverableRevisionHandler {
  static async handle(eventData) {
    const { organizationId, projectId, deliverableId, deliverableTitle, feedback, userId, userName } = eventData;
    console.log(`[AutomationEngine] Handling DeliverableRevision for: ${deliverableTitle}`);

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

        // Update task status back to in_progress
        await supabase
          .from('operations_tasks')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', taskId);

        // Record task activity history
        await supabase
          .from('task_activity_history')
          .insert({
            organization_id: organizationId,
            task_id: taskId,
            actor_id: userId || null,
            actor_name: userName || 'Cliente VIP',
            action_type: 'updated',
            field_name: 'status',
            previous_value: 'pending_approval',
            new_value: 'in_progress',
            metadata_json: { source: 'client_revision_automation', feedback },
          });
      }

      // Log client action audit
      await supabase.from('client_action_audit').insert({
        organization_id: organizationId,
        project_id: projectId,
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        action_type: 'deliverable_revision_requested',
        entity_type: 'deliverable',
        entity_id: deliverableId,
        metadata_json: { deliverable_title: deliverableTitle, feedback },
      });

      return { success: true };
    } catch (err) {
      console.error('[DeliverableRevisionHandler] Execution error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = DeliverableRevisionHandler;
