require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
    const { data, error } = await supabase.from('profiles').select('*');
    console.log(JSON.stringify(data, null, 2));
}
run();
