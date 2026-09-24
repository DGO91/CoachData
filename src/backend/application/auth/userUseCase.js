const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

async function registerUser(name, email) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('System is in maintenance mode. Database unconfigured.');

    const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
        throw new Error('User with this email is already registered');
    }

    const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert([{ name, email, role: 'Client' }])
        .select()
        .single();

    if (insertError) throw insertError;

    const { error: credsError } = await supabase
        .from('user_credentials')
        .insert([{ user_id: newUser.id }]);

    if (credsError) {
        console.error('[Suite] Failed to create empty credentials row for user:', credsError);
    }

    return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        joined: newUser.joined_at ? newUser.joined_at.split('T')[0] : new Date().toISOString().split('T')[0]
    };
}

async function getAllUsers() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured. Access denied.');

    const { data: dbUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .order('joined_at', { ascending: false });

    if (error) throw error;

    return dbUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        joined: u.joined_at ? u.joined_at.split('T')[0] : '2026-06-08'
    }));
}

async function getAdminUsers() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, enabled_agents, joined_at')
        .order('joined_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function updateEnabledAgents(userId, enabled_agents) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
        .from('profiles')
        .update({ enabled_agents })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function deleteUser(userId) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase is not configured. Action denied.');

    const { error: profileErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
    if (profileErr) throw profileErr;

    const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
    if (authErr) {
        console.warn('[Suite] Could not delete auth user (may lack service_role key):', authErr.message);
    }

    return true;
}

async function getCredentialsAudit() {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('id, name, email, role, joined_at');
    if (profErr) throw profErr;

    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;

    const auditMap = {};
    (authUsers?.users || []).forEach((au) => {
        auditMap[au.email] = {
            last_sign_in: au.last_sign_in_at || null,
            email_confirmed: !!au.email_confirmed_at,
            banned: au.banned_until ? true : false,
            created_at: au.created_at || null,
        };
    });

    return (profiles || []).map((p) => {
        const meta = auditMap[p.email] || {};
        const lastSignIn = meta.last_sign_in ? new Date(meta.last_sign_in) : null;
        const now = new Date();
        const daysSinceLogin = lastSignIn ? Math.floor((now - lastSignIn) / (1000 * 60 * 60 * 24)) : null;
        return {
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role,
            joined: p.joined_at ? p.joined_at.split('T')[0] : null,
            last_sign_in: meta.last_sign_in || null,
            email_confirmed: meta.email_confirmed ?? false,
            banned: meta.banned ?? false,
            days_since_login: daysSinceLogin,
            status: meta.banned ? 'banned' : !meta.email_confirmed ? 'unverified' : (daysSinceLogin === null ? 'never_logged' : daysSinceLogin > 30 ? 'inactive' : 'active'),
        };
    });
}

function getLocalUserProfile() {
    return {
        name:         process.env.USER_NAME         || 'Admin User',
        email:        process.env.USER_EMAIL        || '',
        role:         process.env.USER_ROLE         || 'Administrator',
        organization: process.env.USER_ORG          || 'CoachData Media',
        region:       process.env.USER_REGION       || 'Spain / LATAM',
        joined:       process.env.USER_JOINED       || '2024-01-01',
    };
}

module.exports = {
    registerUser,
    getAllUsers,
    getAdminUsers,
    updateEnabledAgents,
    deleteUser,
    getCredentialsAudit,
    getLocalUserProfile
};
