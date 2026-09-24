require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('client_provider_keys')
    .select('provider_name, api_key_encrypted')
    .eq('tenant_id', '2057aff4-28e4-407a-a543-b301e8af4ae0');
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
