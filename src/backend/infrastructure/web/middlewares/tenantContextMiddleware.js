// src/backend/infrastructure/web/middlewares/tenantContextMiddleware.js
const { getSupabaseClient } = require('../../database/supabaseClient');

/**
 * Tenant Context Middleware — CoachData Operational OS v2
 * Resolves organization slug from header (x-organization-slug) or query (?org=),
 * verifies authenticated user membership in Supabase DB,
 * and injects req.tenant context object into downstream Express routes.
 */
async function tenantContextMiddleware(req, res, next) {
  try {
    const supabase = getSupabaseClient();
    
    // 1. Verificar autenticación previa (req.user inyectado por authMiddleware)
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuario no autenticado. Inicie sesión para acceder al recurso multi-tenant.'
      });
    }

    // 2. Resolver slug de la organización desde cabecera x-organization-slug o parámetro de consulta ?org=
    const orgSlug = req.headers['x-organization-slug'] || req.query.org;
    if (!orgSlug) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Falta la cabecera x-organization-slug o el parámetro de consulta org'
      });
    }

    if (!supabase) {
      // Aquí se inventaba un tenant con id 0000...0000, rol 'owner' y plan 'pro'
      // cuando faltaba conexión a Supabase. El resultado era que una instancia
      // mal configurada no fallaba: concedía permisos de propietario sobre una
      // organización inexistente, y las pantallas salían vacías como si el
      // cliente simplemente no tuviera datos.
      console.error('[TenantContext] Supabase no está configurado: no se puede resolver la organización.');
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'La base de datos no está configurada; no se puede resolver el contexto de organización.'
      });
    }

    // 3. Buscar la organización por slug
    let organization = null;
    let orgError = null;

    if (orgSlug && orgSlug !== 'default') {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, plan_tier, settings_json')
        .eq('slug', orgSlug)
        .single();
      organization = data;
      orgError = error;
    } else {
      // Fallback only allowed if user has EXACTLY 1 organization membership
      const { data: memberRows, error: memberErr } = await supabase
        .from('organization_memberships')
        .select('organization_id')
        .eq('user_id', userId);

      if (memberRows && memberRows.length > 1) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'El usuario pertenece a múltiples organizaciones. Debe especificar la cabecera x-organization-slug explícitamente.'
        });
      }

      const singleOrgId = memberRows && memberRows.length === 1 ? memberRows[0].organization_id : null;

      if (singleOrgId) {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, plan_tier, settings_json')
          .eq('id', singleOrgId)
          .single();
        organization = data;
        orgError = error;
      } else {
        // SELF-HEALING: Auto-provision an organization if they are an orphan user
        const { data: orgId, error: wizardErr } = await supabase.rpc('tenant_onboarding_wizard', {
          p_user_id: userId,
          p_email: req.user?.email || 'user@example.com',
          p_full_name: req.user?.user_metadata?.full_name || 'Admin',
          p_org_name: `Org de ${req.user?.email ? req.user.email.split('@')[0] : 'Usuario'}`
        });
        
        if (orgId && !wizardErr) {
          const { data, error } = await supabase
            .from('organizations')
            .select('id, name, slug, plan_tier, settings_json')
            .eq('id', orgId)
            .single();
          organization = data;
          orgError = error;
        } else {
          orgError = wizardErr || new Error('Failed to auto-provision organization');
        }
      }
    }

    if (orgError || !organization) {
      return res.status(404).json({
        error: 'Not Found',
        message: `La organización '${orgSlug}' no existe o el usuario no tiene membresía`
      });
    }

    // 4. Verificar membresía activa del usuario en esa organización
    let { data: membership, error: memberError } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .single();

    console.group('[TENANT CONTEXT]');
    console.log('Auth User:', userId);
    console.log('Email:', req.user?.email);
    console.log('Membership found:', membership);
    console.groupEnd();

    if (memberError || !membership) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Acceso denegado: No posee membresía o acceso a esta organización'
      });
    }

    // 5. Inyectar contexto tenant en req
    req.tenant = {
      id: organization.id,
      role: membership.role,
      details: organization
    };

    next();
  } catch (err) {
    console.error('Error en tenantContextMiddleware:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error procesando el contexto multi-tenant'
    });
  }
}

module.exports = tenantContextMiddleware;
