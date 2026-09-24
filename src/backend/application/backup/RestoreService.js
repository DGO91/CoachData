// src/backend/application/backup/RestoreService.js
const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Service: RestoreService
 * Handles restoring multi-tenant organization state from exported JSON backups.
 */
class RestoreService {
  static async restoreFullOrganization(organizationId, backupData) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client unavailable');

    if (!backupData || !backupData.version) {
      throw new Error('Invalid backup schema');
    }

    const results = {
      projectsRestored: 0,
      tasksRestored: 0,
      deliverablesRestored: 0,
    };

    // Restore projects if available
    if (backupData.projects && backupData.projects.length > 0) {
      const sanitizedProjects = backupData.projects.map(p => ({
        ...p,
        organization_id: organizationId,
      }));
      const { data } = await supabase.from('operations_projects').upsert(sanitizedProjects);
      results.projectsRestored = sanitizedProjects.length;
    }

    // Restore tasks if available
    if (backupData.tasks && backupData.tasks.length > 0) {
      const sanitizedTasks = backupData.tasks.map(t => ({
        ...t,
        organization_id: organizationId,
      }));
      const { data } = await supabase.from('operations_tasks').upsert(sanitizedTasks);
      results.tasksRestored = sanitizedTasks.length;
    }

    // Restore deliverables if available
    if (backupData.client_deliverables && backupData.client_deliverables.length > 0) {
      const sanitizedDeliverables = backupData.client_deliverables.map(d => ({
        ...d,
        organization_id: organizationId,
      }));
      const { data } = await supabase.from('client_deliverables').upsert(sanitizedDeliverables);
      results.deliverablesRestored = sanitizedDeliverables.length;
    }

    return results;
  }
}

module.exports = RestoreService;
