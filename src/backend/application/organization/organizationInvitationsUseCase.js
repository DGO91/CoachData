'use strict';

const crypto = require('crypto');
const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

const VALID_ROLES = ['owner', 'admin', 'manager', 'member', 'client_guest'];

async function listPendingInvitations(organizationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('invitations')
        .select('id, code, role, used, created_at')
        .eq('organization_id', organizationId)
        .eq('used', false)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createInvitation(organizationId, createdByUserId, role) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');
    if (!VALID_ROLES.includes(role)) throw new Error(`Invalid role: ${role}`);

    const code = 'INV-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const { data, error } = await supabase
        .from('invitations')
        .insert([{ code, organization_id: organizationId, role, created_by: createdByUserId, used: false }])
        .select('id, code, role, created_at')
        .single();
    if (error) throw error;
    return data;
}

async function revokeInvitation(organizationId, invitationId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
        .eq('organization_id', organizationId)
        .eq('used', false);
    if (error) throw error;
}

async function redeemInvitation(code, userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: invite, error: findErr } = await supabase
        .from('invitations')
        .select('id, organization_id, role, used')
        .eq('code', code)
        .maybeSingle();
    if (findErr) throw findErr;
    if (!invite) throw new Error('Invalid invitation code');
    if (invite.used) throw new Error('This invitation code has already been used');
    if (!invite.organization_id) throw new Error('This code is not an organization invitation');

    const { data: existing, error: existingErr } = await supabase
        .from('organization_memberships')
        .select('id')
        .eq('organization_id', invite.organization_id)
        .eq('user_id', userId)
        .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing) throw new Error('You are already a member of this organization');

    const { error: memberErr } = await supabase
        .from('organization_memberships')
        .insert([{ organization_id: invite.organization_id, user_id: userId, role: invite.role }]);
    if (memberErr) throw memberErr;

    await supabase
        .from('invitations')
        .update({ used: true, used_by: userId, used_at: new Date().toISOString() })
        .eq('id', invite.id);

    return { organizationId: invite.organization_id, role: invite.role };
}

module.exports = { listPendingInvitations, createInvitation, revokeInvitation, redeemInvitation, VALID_ROLES };
