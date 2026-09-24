require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { encrypt } = require('./src/utils/encryption');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const number = '+34603150391';
  const encryptedNumber = encrypt(number);
  
  await supabase.from('client_provider_keys')
    .delete()
    .eq('tenant_id', '2057aff4-28e4-407a-a543-b301e8af4ae0')
    .eq('provider_name', 'whatsapp_number');
    
  const { data, error } = await supabase.from('client_provider_keys').insert({
    tenant_id: '2057aff4-28e4-407a-a543-b301e8af4ae0',
    provider_type: 'identity',
    provider_name: 'whatsapp_number',
    api_key_encrypted: encryptedNumber
  });
  
  console.log("DB Updated:", error || data);
}
run();
