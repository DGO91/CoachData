require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('client_provider_keys')
    .insert([{
        tenant_id: '2057aff4-28e4-407a-a543-b301e8af4ae0',
        provider_type: 'identity',
        provider_name: 'test_after_tenant',
        api_key_encrypted: 'test'
    }]).select().single();
  console.log("Error:", error);
}
test();
