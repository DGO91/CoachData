const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabaseClient() {
    if (supabase) return supabase;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
        try {
            supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            });
            console.log('[Suite] Supabase client initialized successfully.');
        } catch (err) {
            console.error('[Suite] Failed to initialize Supabase:', err);
        }
    } else {
        console.warn('[Suite] Missing SUPABASE_URL or SUPABASE_KEY in .env. Operating with local fallback.');
    }

    return supabase;
}

// Aquí vivía un Proxy que, si no había cliente, devolvía un objeto falso cuyas
// consultas resolvían a { data: null, error: null }. Es decir: sin base de datos
// configurada, todo respondía "correcto, cero resultados". Una pantalla vacía y
// un test en verde son indistinguibles de un sistema sano bajo ese contrato, que
// es exactamente el fallo que persigue la skill qa_auditor.
//
// Se elimina en lugar de arreglarlo: ningún fichero lo importaba. Los 41 que
// hablan con Supabase usan getSupabaseClient(), que devuelve null cuando falta
// configuración — y todos comprueban ese null antes de consultar.

module.exports = {
    getSupabaseClient
};
