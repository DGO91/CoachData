const { getSupabaseClient } = require('../../infrastructure/database/supabaseClient');

async function syncAndGetTenants() {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data: allProfiles } = await supabase.from('profiles').select('*');
    const clients = (allProfiles || []).filter(p => p.role && p.role.toLowerCase() === 'client');
    const { data: tenants } = await supabase.from('tenants').select('*');
    
    const tenantMap = {};
    (tenants || []).forEach(t => tenantMap[t.id] = t);
    
    const syncedTenants = [];
    for (const client of (clients || [])) {
        if (!tenantMap[client.id]) {
            const newTenant = {
                id: client.id,
                company_name: client.name,
                primary_contact_email: client.email,
                active_package: 'Pending / Free Tier'
            };
            supabase.from('tenants').insert([newTenant]).then();
            syncedTenants.push(newTenant);
        } else {
            syncedTenants.push(tenantMap[client.id]);
        }
    }
    return syncedTenants;
}

async function createTenant({ company_name, primary_contact_email, active_package, market_language }) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.from('tenants').insert([{
        company_name,
        primary_contact_email,
        active_package,
        market_language: market_language || 'en'
    }]).select().single();

    if (error) throw error;
    return data;
}

async function updateTenantPackage(tenantId, active_package) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.from('tenants')
        .update({ active_package })
        .eq('id', tenantId)
        .select().single();

    if (error) throw error;
    return data;
}

module.exports = {
    syncAndGetTenants,
    createTenant,
    updateTenantPackage
};
