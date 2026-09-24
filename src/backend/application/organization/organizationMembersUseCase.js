'use strict';

const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

async function listOrganizationMembers(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: memberships, error: memErr } = await supabase
        .from('organization_memberships')
        .select('user_id, role, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });
    if (memErr) throw memErr;

    if (!memberships || memberships.length === 0) return [];

    const userIds = memberships.map((m) => m.user_id);
    const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);
    if (usersErr) throw usersErr;

    const usersById = Object.fromEntries((users || []).map((u) => [u.id, u]));

    return memberships.map((m) => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.created_at,
        name: usersById[m.user_id]?.full_name || null,
        email: usersById[m.user_id]?.email || null,
    }));
}

module.exports = { listOrganizationMembers };
