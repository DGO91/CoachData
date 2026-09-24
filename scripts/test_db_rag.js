require('dotenv').config({path: '.env'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
async function run() {
    console.log("Checking connection...");
    const { data, error } = await supabase.from('knowledge_documents').select('id').limit(1);
    if (error) {
        console.error("❌ Error checking knowledge_documents table:", error.message);
    } else {
        console.log("✅ Connection successful. knowledge_documents table exists and is accessible.");
    }
}
run();
