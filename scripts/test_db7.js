require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('client_provider_keys').select('*').eq('tenant_id', '2057aff4-28e4-407a-a543-b301e8af4ae0');
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  console.log("Data:", data);
}
check();
