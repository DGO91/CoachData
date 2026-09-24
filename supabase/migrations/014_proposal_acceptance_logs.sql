-- supabase/migrations/014_proposal_acceptance_logs.sql
-- Proposal Acceptance Audit & Security Logs Schema — CoachData Operational OS v2

create table if not exists public.proposal_acceptance_logs (
    id uuid primary key default gen_random_uuid(),
    proposal_id uuid not null references public.proposals(id) on delete cascade,
    action text not null, -- view, approve, reject
    ip_address text,
    user_agent text,
    created_at timestamptz default now()
);

create index if not exists idx_proposal_acceptance_logs_proposal on public.proposal_acceptance_logs(proposal_id);

alter table public.proposal_acceptance_logs enable row level security;

-- Policies allowing public logging of acceptance actions by proposal_id reference
drop policy if exists "Allow select on proposal_acceptance_logs for tenant members" on public.proposal_acceptance_logs;
create policy "Allow select on proposal_acceptance_logs for tenant members"
    on public.proposal_acceptance_logs for select
    using (proposal_id in (select id from public.proposals));

drop policy if exists "Allow public insert into proposal_acceptance_logs" on public.proposal_acceptance_logs;
create policy "Allow public insert into proposal_acceptance_logs"
    on public.proposal_acceptance_logs for insert
    with check (true);
