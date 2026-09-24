-- supabase/migrations/016_organization_invitations.sql
-- Extends the existing global-signup `invitations` table (code/used/created_by,
-- no org or role) so it can also carry org-scoped invites: "join THIS
-- organization as THIS role". Old rows keep working — organization_id/role are
-- nullable, NULL means "legacy global signup code", not an org invite.

ALTER TABLE public.invitations
    ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'client_guest'));

CREATE INDEX IF NOT EXISTS idx_invitations_organization_id ON public.invitations(organization_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Members can see pending invites for organizations they belong to (to display
-- the "pending invitations" list); nothing broader.
DROP POLICY IF EXISTS "Org members can view their organization invitations" ON public.invitations;
CREATE POLICY "Org members can view their organization invitations"
    ON public.invitations FOR SELECT
    USING (
        organization_id IS NOT NULL
        AND organization_id IN (
            SELECT organization_id FROM public.organization_memberships WHERE user_id = auth.uid()
        )
    );

-- No direct INSERT/UPDATE/DELETE policies for clients: invite creation and
-- redemption happen exclusively through the backend (service role, bypasses
-- RLS) so role assignment can be validated server-side (owner/admin only).
