-- supabase/migrations/015_critical_security_hardening.sql
-- Critical security hardening — fixes 4 confirmed multi-tenant isolation issues
-- found during the 2026-08-10 codebase audit. Every statement below is idempotent
-- and safe to re-run regardless of which prior migrations/scripts already applied.

-- ============================================================================
-- 1. Re-enable RLS on `tenants` and `client_provider_keys`.
--
-- scripts/disable_rls.sql and scripts/fix_rls.sql previously disabled RLS (or
-- opened USING(true)/WITH CHECK(true) policies) on these tables, reasoning that
-- the backend used an anon key. That reasoning is stale: supabaseClient.js
-- resolves SUPABASE_SERVICE_ROLE_KEY first, and it IS set in .env — the backend
-- already bypasses RLS via the service role on every request. Re-enabling RLS
-- here does not break backend inserts/updates; it only blocks direct
-- anon/authenticated client access, which is what should have been happening.
-- No client-facing policies are added: these tables are backend-only.
-- ============================================================================

DROP POLICY IF EXISTS "Permitir inserción de tenants" ON public.tenants;
DROP POLICY IF EXISTS "Permitir actualización de tenants" ON public.tenants;
DROP POLICY IF EXISTS "Permitir eliminar tenants" ON public.tenants;
DROP POLICY IF EXISTS "Permitir inserción de llaves" ON public.client_provider_keys;
DROP POLICY IF EXISTS "Permitir actualización de llaves" ON public.client_provider_keys;
DROP POLICY IF EXISTS "Permitir eliminar llaves" ON public.client_provider_keys;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_provider_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Enable RLS on `knowledge_documents` (RAG store).
--
-- It had no RLS at all; isolation depended entirely on the optional
-- filter_tenant_id parameter of match_documents(), which the caller can omit.
-- Direct table access from anon/authenticated is now blocked by default; the
-- backend's knowledge-agent must call match_documents() via the service role
-- client (confirm src/agents/knowledge_agent uses SUPABASE_SERVICE_ROLE_KEY,
-- same as the main backend's supabaseClient.js).
-- ============================================================================

ALTER TABLE IF EXISTS public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Fix cross-tenant leak in proposal_acceptance_logs (migration 014).
--
-- The SELECT policy only checked that proposal_id existed in `proposals` at
-- all, not that the requesting user's organization owned that proposal. Any
-- authenticated user could read IP/user-agent/action logs for every tenant's
-- proposals. The public INSERT policy is intentionally left as-is — it's used
-- by the unauthenticated public proposal view/approve flow.
-- ============================================================================

DROP POLICY IF EXISTS "Allow select on proposal_acceptance_logs for tenant members" ON public.proposal_acceptance_logs;
CREATE POLICY "Tenant members can view their own proposal_acceptance_logs"
    ON public.proposal_acceptance_logs FOR SELECT
    USING (
        proposal_id IN (
            SELECT id FROM public.proposals
            WHERE organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
            )
        )
    );

-- Production audit (2026-08-10) found RLS enabled on this table but with ZERO
-- policies at all — meaning both the leak AND the legitimate public logging
-- insert were blocked by default-deny. Re-add the public insert so the
-- unauthenticated proposal view/approve/reject flow can actually log.
DROP POLICY IF EXISTS "Allow public insert into proposal_acceptance_logs" ON public.proposal_acceptance_logs;
CREATE POLICY "Allow public insert into proposal_acceptance_logs"
    ON public.proposal_acceptance_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 4. Reconcile `proposals` schema drift between migrations 008 and 013.
--
-- Both used `CREATE TABLE IF NOT EXISTS public.proposals` with incompatible
-- column sets. Whichever ran first "won"; if 008 ran first, none of 013's
-- columns (client_name, client_email, public_token, subtotal, tax_amount,
-- total_amount, expires_at, approved_at, rejected_at, viewed_at, crm_deal_id)
-- exist — and publicProposalRoutes.js reads/writes every one of them. This
-- backfills whichever columns are missing, regardless of history.
-- ============================================================================

ALTER TABLE public.proposals
    ADD COLUMN IF NOT EXISTS crm_deal_id uuid REFERENCES public.crm_deals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS client_name text,
    ADD COLUMN IF NOT EXISTS client_email text,
    ADD COLUMN IF NOT EXISTS subtotal integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_amount integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS public_token text DEFAULT encode(gen_random_bytes(16), 'hex'),
    ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '30 days'),
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
    ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- Backfill public_token for any pre-existing rows that predate the column (the
-- DEFAULT above only applies to new rows inserted after this ALTER).
UPDATE public.proposals SET public_token = encode(gen_random_bytes(16), 'hex') WHERE public_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_proposals_public_token_unique ON public.proposals(public_token);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON public.proposals(organization_id);

-- Ensure proposal_items exists too — if 008 ran first, 013 as a whole may have
-- errored out before creating it (its own idx_proposals_token statement would
-- have failed against 008's column set, aborting the rest of the migration).
CREATE TABLE IF NOT EXISTS public.proposal_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price integer NOT NULL DEFAULT 0,
    line_total integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON public.proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_org ON public.proposal_items(organization_id);

ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view proposal items" ON public.proposal_items;
CREATE POLICY "Tenant members can view proposal items"
    ON public.proposal_items FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can insert proposal items" ON public.proposal_items;
CREATE POLICY "Tenant members can insert proposal items"
    ON public.proposal_items FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can update proposal items" ON public.proposal_items;
CREATE POLICY "Tenant members can update proposal items"
    ON public.proposal_items FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can delete proposal items" ON public.proposal_items;
CREATE POLICY "Tenant members can delete proposal items"
    ON public.proposal_items FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()));

-- ============================================================================
-- 5. Restrict billing tables to owner/admin (bonus fix from the same audit,
-- same root cause class: 012_billing_engine.sql let any org member write to
-- Stripe-derived billing records, unlike 005/006/007 which already restrict
-- by role). billing_events additionally drops member SELECT entirely — it's
-- an internal webhook idempotency log, not something members need to read.
--
-- Production audit (2026-08-10) found billing_customers/subscriptions/
-- invoices/events do NOT exist yet — migration 012 was never applied here.
-- This whole section is guarded so it's a no-op today and applies cleanly
-- whenever 012 does get applied (in this or any other environment).
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('public.billing_customers') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Tenant members can insert their billing customer" ON public.billing_customers;
        CREATE POLICY "Org admins can insert their billing customer"
            ON public.billing_customers FOR INSERT
            WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can update their billing customer" ON public.billing_customers;
        CREATE POLICY "Org admins can update their billing customer"
            ON public.billing_customers FOR UPDATE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can delete their billing customer" ON public.billing_customers;
        CREATE POLICY "Org admins can delete their billing customer"
            ON public.billing_customers FOR DELETE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));
    END IF;

    IF to_regclass('public.billing_subscriptions') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Tenant members can insert subscriptions" ON public.billing_subscriptions;
        CREATE POLICY "Org admins can insert subscriptions"
            ON public.billing_subscriptions FOR INSERT
            WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can update subscriptions" ON public.billing_subscriptions;
        CREATE POLICY "Org admins can update subscriptions"
            ON public.billing_subscriptions FOR UPDATE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can delete subscriptions" ON public.billing_subscriptions;
        CREATE POLICY "Org admins can delete subscriptions"
            ON public.billing_subscriptions FOR DELETE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));
    END IF;

    IF to_regclass('public.billing_invoices') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Tenant members can insert invoices" ON public.billing_invoices;
        CREATE POLICY "Org admins can insert invoices"
            ON public.billing_invoices FOR INSERT
            WITH CHECK (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can update invoices" ON public.billing_invoices;
        CREATE POLICY "Org admins can update invoices"
            ON public.billing_invoices FOR UPDATE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        DROP POLICY IF EXISTS "Tenant members can delete invoices" ON public.billing_invoices;
        CREATE POLICY "Org admins can delete invoices"
            ON public.billing_invoices FOR DELETE
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));
    END IF;

    IF to_regclass('public.billing_events') IS NOT NULL THEN
        DROP POLICY IF EXISTS "Tenant members can view billing events" ON public.billing_events;
        CREATE POLICY "Org admins can view billing events"
            ON public.billing_events FOR SELECT
            USING (organization_id IN (
                SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
            ));

        -- No INSERT/UPDATE/DELETE policy is (re)created for billing_events: it is
        -- written exclusively by the backend via the service role, which bypasses
        -- RLS. No org member — including owner/admin — should write to it directly
        -- from the client; that would defeat its purpose as a webhook idempotency log.
        DROP POLICY IF EXISTS "Tenant members can insert billing events" ON public.billing_events;
        DROP POLICY IF EXISTS "Tenant members can update billing events" ON public.billing_events;
        DROP POLICY IF EXISTS "Tenant members can delete billing events" ON public.billing_events;
    END IF;
END $$;

-- ============================================================================
-- Rollback notes (manual — no automated rollback tooling in this repo):
-- 1: re-run scripts/disable_rls.sql (not recommended).
-- 2: ALTER TABLE public.knowledge_documents DISABLE ROW LEVEL SECURITY;
-- 3: revert to the policy in migration 014.
-- 4: additive only (new columns, new table) — safe to leave even if reverted elsewhere.
-- 5: revert to the policies in migration 012.
-- ============================================================================
