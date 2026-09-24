require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function check() {
  const { data, error } = await supabase.from('client_provider_keys').insert([{
      tenant_id: 'b3e3f5cf-3750-4e10-b741-13f6aeb56406',
      provider_type: 'identity',
      provider_name: 'test_save',
      api_key_encrypted: 'abc'
  }]);
  console.log("Insert Error:", error);
  console.log("Data:", data);
}
check();
