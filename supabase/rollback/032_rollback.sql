-- 032_rollback.sql — deshace 032_rls_auth_uid_una_vez_por_consulta.sql
--
-- Devuelve las 47 políticas a `auth.uid()` sin envolver. Solo tiene sentido si
-- el envoltorio resultara ser el causante de algún problema; el índice de
-- `tenants(auth_user_id)` que añade la 032 no se toca aquí, porque quitarlo no
-- arregla nada.

begin;


-- ── agent_reports ───────────────────────────────────────────────

drop policy if exists "members insert own org agent reports" on public.agent_reports;
create policy "members insert own org agent reports" on public.agent_reports as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members see own org agent reports" on public.agent_reports;
create policy "members see own org agent reports" on public.agent_reports as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members update own org agent reports" on public.agent_reports;
create policy "members update own org agent reports" on public.agent_reports as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── agent_schedules ─────────────────────────────────────────────

drop policy if exists "members see own org agent schedules" on public.agent_schedules;
create policy "members see own org agent schedules" on public.agent_schedules as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── ai_tasks ────────────────────────────────────────────────────

drop policy if exists "Tenants can view own AI tasks" on public.ai_tasks;
create policy "Tenants can view own AI tasks" on public.ai_tasks as permissive for select to public
  using ((tenant_id IN ( SELECT tenants.id
   FROM tenants
  WHERE (tenants.auth_user_id = auth.uid()))));

-- ── billing_customers ───────────────────────────────────────────

drop policy if exists "Tenant members can delete their billing customer" on public.billing_customers;
create policy "Tenant members can delete their billing customer" on public.billing_customers as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can insert their billing customer" on public.billing_customers;
create policy "Tenant members can insert their billing customer" on public.billing_customers as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can update their billing customer" on public.billing_customers;
create policy "Tenant members can update their billing customer" on public.billing_customers as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can view their billing customer" on public.billing_customers;
create policy "Tenant members can view their billing customer" on public.billing_customers as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── billing_events ──────────────────────────────────────────────

drop policy if exists "Tenant members can delete billing events" on public.billing_events;
create policy "Tenant members can delete billing events" on public.billing_events as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can insert billing events" on public.billing_events;
create policy "Tenant members can insert billing events" on public.billing_events as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can update billing events" on public.billing_events;
create policy "Tenant members can update billing events" on public.billing_events as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can view billing events" on public.billing_events;
create policy "Tenant members can view billing events" on public.billing_events as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── billing_invoices ────────────────────────────────────────────

drop policy if exists "Tenant members can delete invoices" on public.billing_invoices;
create policy "Tenant members can delete invoices" on public.billing_invoices as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can insert invoices" on public.billing_invoices;
create policy "Tenant members can insert invoices" on public.billing_invoices as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can update invoices" on public.billing_invoices;
create policy "Tenant members can update invoices" on public.billing_invoices as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can view invoices" on public.billing_invoices;
create policy "Tenant members can view invoices" on public.billing_invoices as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── billing_subscriptions ───────────────────────────────────────

drop policy if exists "Tenant members can delete subscriptions" on public.billing_subscriptions;
create policy "Tenant members can delete subscriptions" on public.billing_subscriptions as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can insert subscriptions" on public.billing_subscriptions;
create policy "Tenant members can insert subscriptions" on public.billing_subscriptions as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can update subscriptions" on public.billing_subscriptions;
create policy "Tenant members can update subscriptions" on public.billing_subscriptions as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can view subscriptions" on public.billing_subscriptions;
create policy "Tenant members can view subscriptions" on public.billing_subscriptions as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── canonical_contact ───────────────────────────────────────────

drop policy if exists "members see own org contacts" on public.canonical_contact;
create policy "members see own org contacts" on public.canonical_contact as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── canonical_form_entry ────────────────────────────────────────

drop policy if exists "members see own org form entries" on public.canonical_form_entry;
create policy "members see own org form entries" on public.canonical_form_entry as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── canonical_payment ───────────────────────────────────────────

drop policy if exists "members see own org payments" on public.canonical_payment;
create policy "members see own org payments" on public.canonical_payment as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── canonical_session ───────────────────────────────────────────

drop policy if exists "members see own org sessions" on public.canonical_session;
create policy "members see own org sessions" on public.canonical_session as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── client_intelligence_vault ───────────────────────────────────

drop policy if exists "members insert own org intelligence vault" on public.client_intelligence_vault;
create policy "members insert own org intelligence vault" on public.client_intelligence_vault as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members see own org intelligence vault" on public.client_intelligence_vault;
create policy "members see own org intelligence vault" on public.client_intelligence_vault as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members update own org intelligence vault" on public.client_intelligence_vault;
create policy "members update own org intelligence vault" on public.client_intelligence_vault as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── client_provider_keys ────────────────────────────────────────

drop policy if exists "Tenants can manage own provider keys" on public.client_provider_keys;
create policy "Tenants can manage own provider keys" on public.client_provider_keys as permissive for all to authenticated
  using ((tenant_id = auth.uid()));

-- ── contacts ────────────────────────────────────────────────────

drop policy if exists "Tenants can view own contacts" on public.contacts;
create policy "Tenants can view own contacts" on public.contacts as permissive for select to public
  using ((tenant_id IN ( SELECT tenants.id
   FROM tenants
  WHERE (tenants.auth_user_id = auth.uid()))));

-- ── invitations ─────────────────────────────────────────────────

drop policy if exists "Org members can view their organization invitations" on public.invitations;
create policy "Org members can view their organization invitations" on public.invitations as permissive for select to public
  using (((organization_id IS NOT NULL) AND (organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid())))));

-- ── knowledge_documents ─────────────────────────────────────────

drop policy if exists "Strict isolation for knowledge docs" on public.knowledge_documents;
create policy "Strict isolation for knowledge docs" on public.knowledge_documents as permissive for all to authenticated
  using (((metadata ->> 'tenant_id'::text) = (auth.uid())::text));

-- ── lead_scoring_config ─────────────────────────────────────────

drop policy if exists "members delete own org lead scoring config" on public.lead_scoring_config;
create policy "members delete own org lead scoring config" on public.lead_scoring_config as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members insert own org lead scoring config" on public.lead_scoring_config;
create policy "members insert own org lead scoring config" on public.lead_scoring_config as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members select own org lead scoring config" on public.lead_scoring_config;
create policy "members select own org lead scoring config" on public.lead_scoring_config as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "members update own org lead scoring config" on public.lead_scoring_config;
create policy "members update own org lead scoring config" on public.lead_scoring_config as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))))
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── operations_tasks ────────────────────────────────────────────

drop policy if exists org_isolation_tasks on public.operations_tasks;
create policy org_isolation_tasks on public.operations_tasks as permissive for all to public
  using (((organization_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid())))))
  with check (((organization_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid())))));

-- ── profiles ────────────────────────────────────────────────────

drop policy if exists "Strict isolation for profiles" on public.profiles;
create policy "Strict isolation for profiles" on public.profiles as permissive for all to authenticated
  using ((id = auth.uid()));

-- ── proposal_acceptance_logs ────────────────────────────────────

drop policy if exists "Tenant members can view their own proposal_acceptance_logs" on public.proposal_acceptance_logs;
create policy "Tenant members can view their own proposal_acceptance_logs" on public.proposal_acceptance_logs as permissive for select to public
  using ((proposal_id IN ( SELECT proposals.id
   FROM proposals
  WHERE (proposals.organization_id IN ( SELECT organization_memberships.organization_id
           FROM organization_memberships
          WHERE (organization_memberships.user_id = auth.uid()))))));

-- ── proposal_items ──────────────────────────────────────────────

drop policy if exists "Tenant members can delete proposal items" on public.proposal_items;
create policy "Tenant members can delete proposal items" on public.proposal_items as permissive for delete to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can insert proposal items" on public.proposal_items;
create policy "Tenant members can insert proposal items" on public.proposal_items as permissive for insert to public
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can update proposal items" on public.proposal_items;
create policy "Tenant members can update proposal items" on public.proposal_items as permissive for update to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

drop policy if exists "Tenant members can view proposal items" on public.proposal_items;
create policy "Tenant members can view proposal items" on public.proposal_items as permissive for select to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
   FROM organization_memberships
  WHERE (organization_memberships.user_id = auth.uid()))));

-- ── tenants ─────────────────────────────────────────────────────

drop policy if exists "Tenants can manage own profile" on public.tenants;
create policy "Tenants can manage own profile" on public.tenants as permissive for all to authenticated
  using ((id = auth.uid()));

-- ── user_credentials ────────────────────────────────────────────

drop policy if exists "Strict isolation for user credentials" on public.user_credentials;
create policy "Strict isolation for user credentials" on public.user_credentials as permissive for all to authenticated
  using ((user_id = auth.uid()));

-- ── users ───────────────────────────────────────────────────────

drop policy if exists users_select_policy on public.users;
create policy users_select_policy on public.users as permissive for select to public
  using (((id = auth.uid()) OR (id IN ( SELECT organization_memberships.user_id
   FROM organization_memberships
  WHERE (organization_memberships.organization_id IN ( SELECT get_auth_user_organizations() AS get_auth_user_organizations))))));

drop policy if exists users_update_policy on public.users;
create policy users_update_policy on public.users as permissive for update to public
  using ((id = auth.uid()))
  with check ((id = auth.uid()));


commit;
