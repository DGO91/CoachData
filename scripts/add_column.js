require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY);
async function run() {
    const { error } = await supabase.rpc('execute_sql', { sql: 'ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agent_schedules JSONB DEFAULT \'{}\'::jsonb;' });
    if(error) console.log("RPC Error:", error);
    else console.log("Column added or already exists.");
}
run();
