-- supabase/migrations/013_public_proposal_engine.sql
-- Public Proposal Engine & Conversion Architecture — CoachData Operational OS v2

-- 1. proposals
create table if not exists public.proposals (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    crm_deal_id uuid references public.crm_deals(id) on delete set null,
    title text not null,
    client_name text not null,
    client_email text not null,
    currency text not null default 'EUR',
    subtotal integer not null default 0,
    tax_amount integer default 0,
    total_amount integer not null default 0,
    status text not null default 'draft', -- draft, sent, viewed, approved, rejected, converted
    public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
    expires_at timestamptz default (now() + interval '30 days'),
    approved_at timestamptz,
    rejected_at timestamptz,
    viewed_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_proposals_org on public.proposals(organization_id);
create index if not exists idx_proposals_token on public.proposals(public_token);

alter table public.proposals enable row level security;

drop policy if exists "Tenant members can view proposals" on public.proposals;
create policy "Tenant members can view proposals"
    on public.proposals for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert proposals" on public.proposals;
create policy "Tenant members can insert proposals"
    on public.proposals for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update proposals" on public.proposals;
create policy "Tenant members can update proposals"
    on public.proposals for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete proposals" on public.proposals;
create policy "Tenant members can delete proposals"
    on public.proposals for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

-- 2. proposal_items
create table if not exists public.proposal_items (
    id uuid primary key default gen_random_uuid(),
    proposal_id uuid not null references public.proposals(id) on delete cascade,
    organization_id uuid not null references public.organizations(id) on delete cascade,
    description text not null,
    quantity numeric not null default 1,
    unit_price integer not null default 0,
    line_total integer not null default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_proposal_items_proposal on public.proposal_items(proposal_id);
create index if not exists idx_proposal_items_org on public.proposal_items(organization_id);

alter table public.proposal_items enable row level security;

drop policy if exists "Tenant members can view proposal items" on public.proposal_items;
create policy "Tenant members can view proposal items"
    on public.proposal_items for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert proposal items" on public.proposal_items;
create policy "Tenant members can insert proposal items"
    on public.proposal_items for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update proposal items" on public.proposal_items;
create policy "Tenant members can update proposal items"
    on public.proposal_items for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete proposal items" on public.proposal_items;
create policy "Tenant members can delete proposal items"
    on public.proposal_items for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));
