/**
 * publicInvitationRoutes.js
 * Production-Hardened Public Invitation Validation & Redemption Engine — CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getSupabaseClient } = require('../../database/supabaseClient');

// Rate limiter for public invitation endpoints (30 requests per IP per 15 minutes)
const publicInvitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many invitation checks from this IP. Please try again later.' }
});

router.use(publicInvitationLimiter);

/**
 * GET /validate/:code (and GET /:code for legacy)
 * Sanitized public endpoint to check if an invite code is valid and unused.
 * Exposes zero internal credentials, created_by IDs, or organization metadata.
 */
router.get('/validate/:code', async (req, res) => {
  const { code } = req.params;
  const cleanCode = (code || '').trim().toUpperCase();

  if (!cleanCode || cleanCode.length < 4) {
    return res.json({ valid: false, message: 'Invalid code format' });
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    // Sin base de datos no se puede validar nada. Una puerta de seguridad falla
    // CERRADA: antes, si Supabase no respondia, cualquier codigo que empezara
    // por "INV-" se daba por valido — y esa condicion estaba en un `||`, asi
    // que no dependia de NODE_ENV en absoluto.
    // (El status era 53, que no es un codigo HTTP valido: Express lanzaba
    //  excepcion y devolvia 500 sin el cuerpo JSON.)
    return res.status(503).json({ valid: false, message: 'Servicio no disponible' });
  }

  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('code, used')
      .eq('code', cleanCode)
      .maybeSingle();

    if (error) {
      console.error('[PublicInvitations] DB Error validating code:', error.message);
      return res.status(500).json({ valid: false, error: 'Failed to validate invite code' });
    }

    if (!data || data.used) {
      return res.json({ valid: false, message: 'Código de invitación inválido o ya utilizado' });
    }

    res.json({ valid: true, code: data.code });
  } catch (err) {
    console.error('[PublicInvitations] GET validate error:', err.message);
    res.status(500).json({ valid: false, error: err.message });
  }
});

/**
 * POST /use/:code
 * Public endpoint to mark an invite code as used immediately following signup.
 * Requires valid UUID user_id and updates idempotently where used = false.
 */
router.post('/use/:code', async (req, res) => {
  const { code } = req.params;
  const { user_id } = req.body || {};
  const cleanCode = (code || '').trim().toUpperCase();

  if (!cleanCode || !user_id) {
    return res.status(400).json({ success: false, message: 'Missing code or user_id' });
  }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Se valida siempre: saltarse el formato en development no aporta nada y
  // hace que el codigo de desarrollo no sea el que se prueba.
  if (!uuidRegex.test(user_id)) {
    return res.status(400).json({ success: false, message: 'Invalid user_id format' });
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    // Nunca confirmar un canje que no se ha podido escribir: el usuario creeria
    // que esta dentro de la organizacion cuando no lo esta.
    return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  }

  try {
    const { data, error } = await supabase
      .from('invitations')
      .update({
        used: true,
        used_by: user_id,
        used_at: new Date().toISOString()
      })
      .eq('code', cleanCode)
      .eq('used', false)
      .select('code, used')
      .maybeSingle();

    if (error) {
      console.error('[PublicInvitations] DB Error marking code as used:', error.message);
      return res.status(500).json({ success: false, error: 'Failed to redeem invite code' });
    }

    if (!data) {
      return res.status(400).json({ success: false, message: 'Código de invitación no encontrado o ya utilizado' });
    }

    res.json({ success: true, message: 'Código de invitación canjeado con éxito' });
  } catch (err) {
    console.error('[PublicInvitations] POST use error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
