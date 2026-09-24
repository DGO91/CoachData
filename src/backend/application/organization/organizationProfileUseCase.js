'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

// industry/timezone/currency/language have no dedicated columns on `organizations`
// (checked supabase/migrations/001_security_patch.sql) — they live inside the
// existing settings_json JSONB column, which exists precisely for this kind of
// flexible per-org configuration.
function profileFromRow(row) {
    const settings = row.settings_json || {};
    return {
        name: row.name,
        industry: settings.industry || '',
        timezone: settings.timezone || '',
        currency: settings.currency || '',
        language: settings.language || '',
    };
}

async function getOrganizationProfile(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('organizations')
        .select('name, settings_json')
        .eq('id', organizationId)
        .single();

    if (error) throw error;
    return profileFromRow(data);
}

async function updateOrganizationProfile(organizationId, { name, industry, timezone, currency, language }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: current, error: fetchErr } = await supabase
        .from('organizations')
        .select('name, settings_json')
        .eq('id', organizationId)
        .single();
    if (fetchErr) throw fetchErr;

    const updatedSettings = {
        ...(current.settings_json || {}),
        ...(industry !== undefined ? { industry } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(language !== undefined ? { language } : {}),
    };

    const { data, error } = await supabase
        .from('organizations')
        .update({
            ...(name !== undefined && name !== '' ? { name } : {}),
            settings_json: updatedSettings,
            updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
        .select('name, settings_json')
        .single();

    if (error) throw error;
    return profileFromRow(data);
}

const DEFAULT_PIPELINE_STAGES = ['Lead Captured', 'AI Qualified', 'Call Logged', 'Proposal Sent'];

async function getPipelineStages(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('id', organizationId)
        .single();
    if (error) throw error;

    return data.settings_json?.pipeline_stages || DEFAULT_PIPELINE_STAGES;
}

async function updatePipelineStages(organizationId, stages) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');
    if (!Array.isArray(stages) || stages.some((s) => typeof s !== 'string' || !s.trim())) {
        throw new Error('stages must be a non-empty array of non-empty strings');
    }

    const { data: current, error: fetchErr } = await supabase
        .from('organizations')
        .select('settings_json')
        .eq('id', organizationId)
        .single();
    if (fetchErr) throw fetchErr;

    const { error } = await supabase
        .from('organizations')
        .update({
            settings_json: { ...(current.settings_json || {}), pipeline_stages: stages },
            updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);
    if (error) throw error;

    return stages;
}

// Exports what's realistically fetchable per-tenant today: profile, tables that
// exist and are known to carry organization_id (checked against the migrations
// this session audited). Not an exhaustive backup of every table in the schema.
async function exportOrganizationWorkspace(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const [org, tasks, deals, proposals] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', organizationId).single(),
        supabase.from('operations_tasks').select('*').eq('organization_id', organizationId),
        supabase.from('crm_deals').select('*').eq('organization_id', organizationId),
        supabase.from('proposals').select('*').eq('organization_id', organizationId),
    ]);

    return {
        exported_at: new Date().toISOString(),
        organization: org.data || null,
        operations_tasks: tasks.data || [],
        crm_deals: deals.data || [],
        proposals: proposals.data || [],
    };
}

module.exports = {
    getOrganizationProfile,
    updateOrganizationProfile,
    getPipelineStages,
    updatePipelineStages,
    exportOrganizationWorkspace,
};
