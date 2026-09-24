const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('../../.env', 'utf-8');
const supabaseUrl = env.match(/SUPABASE_URL=(.*)/)[1].trim();
const supabaseServiceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verify() {
  const { data, error } = await supabase.from('crm_contacts')
    .select('first_name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) console.error(error);
  else console.table(data);
}
verify();
