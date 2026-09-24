require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('client_provider_keys').select('*').eq('provider_name', 'whatsapp_provider');
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
