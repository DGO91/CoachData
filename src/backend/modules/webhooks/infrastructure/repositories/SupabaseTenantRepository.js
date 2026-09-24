'use strict';

const { ITenantRepository }   = require('../../application/ports/ITenantRepository');
const { TenantNotFoundError } = require('../../domain/errors/TenantNotFoundError');
const { Tenant }              = require('../../domain/Tenant');

class SupabaseTenantRepository extends ITenantRepository {
    constructor(supabaseClient) {
        super();
        this.client = supabaseClient;
    }

    async findById(tenantId) {
        const { data, error } = await this.client
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();

        if (error || !data) throw new TenantNotFoundError(tenantId);

        let orgId = data.organization_id || null;

        // Fallback Phase 1: Resolve via auth_user_id -> organization_memberships with deterministic ordering
        if (!orgId && data.auth_user_id) {
            try {
                const { data: memberData } = await this.client
                    .from('organization_memberships')
                    .select('organization_id, role, created_at')
                    .eq('user_id', data.auth_user_id)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (memberData?.organization_id) {
                    orgId = memberData.organization_id;
                }
            } catch (fallbackErr) {
                console.warn(`[SupabaseTenantRepository] Fallback resolution failed for tenant ${tenantId}:`, fallbackErr.message);
            }
        }

        // Fallback Phase 2: Match by company_name against organizations table
        if (!orgId && data.company_name) {
            try {
                const { data: orgData } = await this.client
                    .from('organizations')
                    .select('id')
                    .or(`name.ilike.${data.company_name.trim()},slug.ilike.${data.company_name.trim()}`)
                    .limit(1)
                    .maybeSingle();

                if (orgData?.id) {
                    orgId = orgData.id;
                }
            } catch (orgMatchErr) {
                console.warn(`[SupabaseTenantRepository] Company name match failed for tenant ${tenantId}:`, orgMatchErr.message);
            }
        }

        if (!orgId) {
            console.warn(`[SupabaseTenantRepository] WARNING: Could not resolve organizationId for tenant ${tenantId}. Canonical ingestion will be skipped.`);
        }

        return new Tenant({
            id:             data.id,
            companyName:    data.company_name,
            organizationId: orgId,
        });
    }
}

module.exports = { SupabaseTenantRepository };
