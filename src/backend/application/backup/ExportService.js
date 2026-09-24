// src/backend/application/backup/ExportService.js
const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

/**
 * Service: ExportService
 * Handles multi-tenant organization data exports into JSON or CSV formats for disaster recovery and client backups.
 */
class ExportService {
  static async exportFullOrganization(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client unavailable');

    const [{ data: org }, { data: tasks }, { data: projects }, { data: content }, { data: deliverables }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', organizationId).single(),
      supabase.from('operations_tasks').select('*').eq('organization_id', organizationId),
      supabase.from('operations_projects').select('*').eq('organization_id', organizationId),
      supabase.from('growth_content').select('*').eq('organization_id', organizationId),
      supabase.from('client_deliverables').select('*').eq('organization_id', organizationId),
    ]);

    return {
      version: 'v0.7.5',
      exported_at: new Date().toISOString(),
      organization: org || {},
      projects: projects || [],
      tasks: tasks || [],
      growth_content: content || [],
      client_deliverables: deliverables || [],
    };
  }

  static async exportTasksToCSV(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client unavailable');

    const { data: tasks } = await supabase
      .from('operations_tasks')
      .select('id, title, description, status, priority, due_date, created_at')
      .eq('organization_id', organizationId);

    if (!tasks || tasks.length === 0) return 'id,title,description,status,priority,due_date,created_at\n';

    const headers = 'id,title,description,status,priority,due_date,created_at';
    const rows = tasks.map(t => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.due_date || ''}"`,
      `"${t.created_at}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  static async exportContentToCSV(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Database client unavailable');

    const { data: content } = await supabase
      .from('growth_content')
      .select('id, title, channel, status, scheduled_date, created_at')
      .eq('organization_id', organizationId);

    if (!content || content.length === 0) return 'id,title,channel,status,scheduled_date,created_at\n';

    const headers = 'id,title,channel,status,scheduled_date,created_at';
    const rows = content.map(c => [
      `"${c.id}"`,
      `"${(c.title || '').replace(/"/g, '""')}"`,
      `"${c.channel || ''}"`,
      `"${c.status}"`,
      `"${c.scheduled_date || ''}"`,
      `"${c.created_at}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

module.exports = ExportService;
