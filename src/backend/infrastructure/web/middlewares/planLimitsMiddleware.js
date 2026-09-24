'use strict';

const { getSupabaseClient } = require('../../database/supabaseClient');

const PLAN_QUOTAS = {
  free: {
    maxContacts: 100,
    maxAgentExecutions: 50,
  },
  pro: {
    maxContacts: 5000,
    maxAgentExecutions: 2500,
  },
  enterprise: {
    maxContacts: Infinity,
    maxAgentExecutions: Infinity,
  },
};

/**
 * planLimitsMiddleware — Enforces plan feature quotas (Free, Pro, Enterprise) per tenant organization.
 *
 * @param {'contacts'|'agent_executions'} resourceType
 */
function checkPlanQuota(resourceType) {
  return async (req, res, next) => {
    const tenant = req.tenant;
    if (!tenant || !tenant.id) {
      return res.status(403).json({ error: 'Tenant context required for plan limit check' });
    }

    const planTier = (tenant.plan_tier || tenant.details?.plan_tier || 'pro').toLowerCase();
    const quota = PLAN_QUOTAS[planTier] || PLAN_QUOTAS.pro;

    const supabase = getSupabaseClient();
    if (!supabase) return next(); // Graceful fallback if DB client unavailable

    try {
      if (resourceType === 'contacts' && Number.isFinite(quota.maxContacts)) {
        const { count, error } = await supabase
          .from('crm_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', tenant.id);

        if (!error && typeof count === 'number' && count >= quota.maxContacts) {
          return res.status(402).json({
            error: `Plan limit reached: The ${planTier.toUpperCase()} plan allows up to ${quota.maxContacts} contacts. Please upgrade your plan in Billing Settings.`,
            code: 'PLAN_LIMIT_REACHED',
            planTier,
            limit: quota.maxContacts,
            current: count,
          });
        }
      }

      if (resourceType === 'agent_executions' && Number.isFinite(quota.maxAgentExecutions)) {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count, error } = await supabase
          .from('ai_agent_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', tenant.id)
          .gte('created_at', firstDayOfMonth);

        if (!error && typeof count === 'number' && count >= quota.maxAgentExecutions) {
          return res.status(402).json({
            error: `Plan limit reached: The ${planTier.toUpperCase()} plan allows up to ${quota.maxAgentExecutions} monthly AI agent executions. Please upgrade your plan in Billing Settings.`,
            code: 'PLAN_LIMIT_REACHED',
            planTier,
            limit: quota.maxAgentExecutions,
            current: count,
          });
        }
      }
    } catch (err) {
      console.error(`[planLimitsMiddleware] Error checking ${resourceType} quota:`, err.message);
    }

    next();
  };
}

module.exports = { checkPlanQuota, PLAN_QUOTAS };
