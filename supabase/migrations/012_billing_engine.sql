-- supabase/migrations/012_billing_engine.sql
-- Multi-Tenant Stripe Billing & Subscriptions Schema — CoachData Operational OS v2

-- 1. billing_customers
create table if not exists public.billing_customers (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    stripe_customer_id text not null unique,
    email text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_billing_customers_org on public.billing_customers(organization_id);

alter table public.billing_customers enable row level security;

drop policy if exists "Tenant members can view their billing customer" on public.billing_customers;
create policy "Tenant members can view their billing customer"
    on public.billing_customers for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert their billing customer" on public.billing_customers;
create policy "Tenant members can insert their billing customer"
    on public.billing_customers for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update their billing customer" on public.billing_customers;
create policy "Tenant members can update their billing customer"
    on public.billing_customers for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete their billing customer" on public.billing_customers;
create policy "Tenant members can delete their billing customer"
    on public.billing_customers for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

-- 2. billing_subscriptions
create table if not exists public.billing_subscriptions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    stripe_subscription_id text not null unique,
    stripe_price_id text not null,
    plan text not null default 'pro',
    status text not null default 'active',
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_billing_subscriptions_org on public.billing_subscriptions(organization_id);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "Tenant members can view subscriptions" on public.billing_subscriptions;
create policy "Tenant members can view subscriptions"
    on public.billing_subscriptions for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert subscriptions" on public.billing_subscriptions;
create policy "Tenant members can insert subscriptions"
    on public.billing_subscriptions for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update subscriptions" on public.billing_subscriptions;
create policy "Tenant members can update subscriptions"
    on public.billing_subscriptions for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete subscriptions" on public.billing_subscriptions;
create policy "Tenant members can delete subscriptions"
    on public.billing_subscriptions for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

-- 3. billing_invoices
create table if not exists public.billing_invoices (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    stripe_invoice_id text not null unique,
    invoice_number text,
    amount_due integer not null default 0,
    currency text not null default 'eur',
    hosted_invoice_url text,
    invoice_pdf text,
    status text not null default 'paid',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_billing_invoices_org on public.billing_invoices(organization_id);

alter table public.billing_invoices enable row level security;

drop policy if exists "Tenant members can view invoices" on public.billing_invoices;
create policy "Tenant members can view invoices"
    on public.billing_invoices for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert invoices" on public.billing_invoices;
create policy "Tenant members can insert invoices"
    on public.billing_invoices for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update invoices" on public.billing_invoices;
create policy "Tenant members can update invoices"
    on public.billing_invoices for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete invoices" on public.billing_invoices;
create policy "Tenant members can delete invoices"
    on public.billing_invoices for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

-- 4. billing_events (Idempotency)
create table if not exists public.billing_events (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete set null,
    stripe_event_id text not null unique,
    event_type text not null,
    payload jsonb not null default '{}'::jsonb,
    processed boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_billing_events_org on public.billing_events(organization_id);

alter table public.billing_events enable row level security;

drop policy if exists "Tenant members can view billing events" on public.billing_events;
create policy "Tenant members can view billing events"
    on public.billing_events for select
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can insert billing events" on public.billing_events;
create policy "Tenant members can insert billing events"
    on public.billing_events for insert
    with check (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can update billing events" on public.billing_events;
create policy "Tenant members can update billing events"
    on public.billing_events for update
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));

drop policy if exists "Tenant members can delete billing events" on public.billing_events;
create policy "Tenant members can delete billing events"
    on public.billing_events for delete
    using (organization_id in (select organization_id from public.organization_memberships where user_id = auth.uid()));
