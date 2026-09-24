require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('tenants').insert([{
      id: '2057aff4-28e4-407a-a543-b301e8af4ae0',
      company_name: 'Test Client',
      primary_contact_email: 'test@example.com',
      active_package: 'Pending / Free Tier'
  }]);
  console.log("Error:", error);
}
test();
