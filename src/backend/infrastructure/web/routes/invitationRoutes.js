const express = require('express');
const router = express.Router();
// Consulta con la identidad de quien pide, para que Postgres aplique RLS.
const { dbDeUsuario } = require('../../database/userScopedClient');
const crypto = require('crypto');

// Generate a new invite code
router.post('/generate', async (req, res) => {
    try {
        const supabase = dbDeUsuario(req, res);
        if (!supabase) return;   // dbDeUsuario ya respondió 401

        // Verify user is logged in (basic security to prevent anonymous generation)
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'Unauthorized' });
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

        // Generate a random 8-character invite code
        const code = 'INV-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        // Create an auth-aware client using the user's token so RLS allows the insert
        const { createClient } = require('@supabase/supabase-js');
        const authSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        const { data, error } = await authSupabase
            .from('invitations')
            .insert([{
                code,
                used: false,
                created_by: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, invite: data });
    } catch (error) {
        console.error('[Invitations] Error generating invite:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /validate/:code y POST /use/:code vivían aquí y eran inalcanzables:
// app.js monta publicInvitationRoutes sobre este mismo prefijo y antes que
// este router, así que Express servía siempre aquellas. Y debe hacerlo — quien
// canjea una invitación todavía no tiene cuenta, de modo que no puede pasar por
// authMiddleware. Además la versión pública es la más defensiva: aplica rate
// limit, valida el formato del user_id y actualiza sólo donde used = false.
//
// Se eliminan en lugar de mantener dos copias divergentes de la misma lógica,
// donde arreglar la copia muerta daría la falsa impresión de haber arreglado el
// endpoint. Este router conserva únicamente /generate, que sí exige sesión.
// Cubierto por scripts/test-invitations-routing.js.

module.exports = router;
