import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('../../.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const supabaseServiceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) console.error("Error:", error.message);
  else console.log("Auth Users:", users.users.map(u => ({id: u.id, email: u.email})));
}
check();
