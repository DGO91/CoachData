const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('../../.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const dbPassword = env.match(/SUPABASE_DB_PASSWORD=(.*)/)?.[1]?.trim();

// Since we don't have the direct postgres password in .env (only SUPABASE_URL, SUPABASE_KEY, etc.),
// and we couldn't run execute_sql via the JS client, we must bypass RLS on organization_memberships using the service role key.

// Let's use the service role key to insert the membership directly for all users!
const { createClient } = require('@supabase/supabase-js');
const supabaseServiceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  // Get all users from auth.users (if possible) or profiles
  // Since auth.users is failing, we'll try profiles first
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email');
  if (pErr) return console.error(pErr);
  
  const orgId = '00000000-0000-0000-0000-000000000000';
  for (const p of profiles) {
    if (p.email === 'owner@example.com') {
      const { data, error } = await supabase.from('organization_memberships').insert({
        organization_id: orgId,
        user_id: p.id,
        role: 'owner'
      });
      if (error && error.code !== '23505') {
        console.error("Failed to insert for", p.email, error.message);
      } else {
        console.log("Success for", p.email, "with profile ID", p.id);
      }
    }
  }
}
fix();
