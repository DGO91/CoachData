/**
 * publicWaitlistRoutes.js
 * Production-Hardened Public Waitlist Engine & Anti-Enumeration Landing API — CoachData Operational OS v2
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getSupabaseClient } = require('../../database/supabaseClient');

// In-memory fallback store for dev environment when DB table is unconfigured
const devMemoryWaitlist = new Map();

// Strict Rate Limiter for Public Waitlist Submissions (5 requests per hour per IP)
const publicWaitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, error: 'Too many waitlist submissions from this IP. Please try again later.' }
});

router.use(publicWaitlistLimiter);

/**
 * POST /api/public/waitlist
 * Public endpoint to submit an email for the landing page waitlist.
 * Enforces anti-enumeration protection: Always returns { "success": true } for valid emails.
 */
router.post('/', async (req, res) => {
  const { email, name, role, source, locale } = req.body || {};

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ success: false, error: 'Formato de email inválido' });
  }

  // Hygiene: Truncate text fields to max 120 chars to prevent payload bloat
  const cleanName = (name || '').trim().substring(0, 120) || null;
  const cleanRole = (role || '').trim().substring(0, 120) || null;
  const cleanSource = (source || '').trim().substring(0, 120) || 'landing';
  const cleanLocale = (locale || '').trim().substring(0, 10) || 'es';

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!existing) {
        const { error: insErr } = await supabase
          .from('waitlist')
          .insert([{
            email: cleanEmail,
            name: cleanName,
            role: cleanRole,
            source: cleanSource,
            locale: cleanLocale,
            created_at: new Date().toISOString()
          }]);

        if (insErr && insErr.code !== '23505' && insErr.code !== '42P01') {
          console.error('[PublicWaitlist] DB Insert Error:', insErr.message);
        }
      }
    } catch (err) {
      console.error('[PublicWaitlist] Processing error:', err.message);
    }
  }

  // In-memory dev fallback store for testing environments
  if (!devMemoryWaitlist.has(cleanEmail)) {
    devMemoryWaitlist.set(cleanEmail, {
      id: `dev_wl_${Date.now()}`,
      email: cleanEmail,
      name: cleanName,
      role: cleanRole,
      source: cleanSource,
      locale: cleanLocale,
      created_at: new Date().toISOString(),
      contacted_at: null
    });
  }

  // Anti-enumeration: Always return { "success": true } for valid emails
  return res.json({ success: true });
});

module.exports = {
  router,
  devMemoryWaitlist
};
