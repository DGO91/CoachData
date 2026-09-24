import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('../../.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const supabaseServiceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fix() {
  const { data: profiles } = await supabase.from('profiles').select('id');
  const defaultOrgId = '00000000-0000-0000-0000-000000000000';
  
  for (const p of profiles) {
    const { error } = await supabase.from('organization_memberships').insert({
      organization_id: defaultOrgId,
      user_id: p.id,
      role: 'owner'
    });
    if (error && error.code !== '23505') { // Ignore unique violation if already exists
      console.error("Error for", p.id, error.message);
    } else {
      console.log("Added/exists membership for", p.id);
    }
  }
}
fix();
