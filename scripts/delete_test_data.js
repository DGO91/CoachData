require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('client_provider_keys').delete().eq('api_key_encrypted', 'meta_encrypted_test');
  console.log('Deleted:', error || data);
}
run();
