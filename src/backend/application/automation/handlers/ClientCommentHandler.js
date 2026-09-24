// src/backend/application/automation/handlers/ClientCommentHandler.js
const { getSupabaseClient } = require('../../../infrastructure/database/supabaseClient');

/**
 * Handler: ClientCommentHandler
 * Triggered when a client posts a comment in the Client Workspace.
 * - Logs audit trail in client_action_audit
 * - Updates project's updated_at timestamp
 */
class ClientCommentHandler {
  static async handle(eventData) {
    const { organizationId, projectId, commentId, content, userId, userName } = eventData;
    console.log(`[AutomationEngine] Handling ClientComment event in project: ${projectId}`);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // 1. Update project timestamp
      await supabase
        .from('operations_projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

      // 2. Log client action audit
      await supabase.from('client_action_audit').insert({
        organization_id: organizationId,
        project_id: projectId,
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        action_type: 'comment_created',
        entity_type: 'comment',
        entity_id: commentId || '00000000-0000-0000-0000-000000000000',
        metadata_json: { author: userName || 'Cliente VIP', preview: content ? content.slice(0, 50) : '' },
      });

      return { success: true };
    } catch (err) {
      console.error('[ClientCommentHandler] Execution error:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = ClientCommentHandler;
