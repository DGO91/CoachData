require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('client_provider_keys')
    .delete()
    .eq('provider_name', 'test_after_tenant');
  console.log("Deleted:", error || data);
}
run();
