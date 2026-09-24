-- 033_rollback.sql — deshace 033_rls_auth_role_una_vez_por_consulta.sql
--
-- Devuelve las 14 políticas a `auth.role()` sin envolver. Solo tiene sentido
-- si el envoltorio resultara ser el causante de algún problema.
--
-- Generado desde el propio 033 sustituyendo `(select auth.role())` por
-- `auth.role()`, para que ambos ficheros no puedan divergir.

begin;

-- ── agent_schedules ─────────────────────────────────────────────

drop policy if exists "service role full access agent schedules" on public.agent_schedules;
create policy "service role full access agent schedules" on public.agent_schedules as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── canonical_contact ───────────────────────────────────────────

drop policy if exists "service role full access contacts" on public.canonical_contact;
create policy "service role full access contacts" on public.canonical_contact as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── canonical_form_entry ────────────────────────────────────────

drop policy if exists "service role full access form entries" on public.canonical_form_entry;
create policy "service role full access form entries" on public.canonical_form_entry as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── canonical_payment ───────────────────────────────────────────

drop policy if exists "service role full access payments" on public.canonical_payment;
create policy "service role full access payments" on public.canonical_payment as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── canonical_session ───────────────────────────────────────────

drop policy if exists "service role full access sessions" on public.canonical_session;
create policy "service role full access sessions" on public.canonical_session as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── client_intelligence_vault ───────────────────────────────────

drop policy if exists "service_role delete intelligence vault" on public.client_intelligence_vault;
create policy "service_role delete intelligence vault" on public.client_intelligence_vault as permissive for delete to public
  using ((auth.role() = 'service_role'::text));

drop policy if exists "service_role insert intelligence vault" on public.client_intelligence_vault;
create policy "service_role insert intelligence vault" on public.client_intelligence_vault as permissive for insert to public
  with check ((auth.role() = 'service_role'::text));

drop policy if exists "service_role select intelligence vault" on public.client_intelligence_vault;
create policy "service_role select intelligence vault" on public.client_intelligence_vault as permissive for select to public
  using ((auth.role() = 'service_role'::text));

drop policy if exists "service_role update intelligence vault" on public.client_intelligence_vault;
create policy "service_role update intelligence vault" on public.client_intelligence_vault as permissive for update to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── lead_scoring_config ─────────────────────────────────────────

drop policy if exists "service role delete lead scoring config" on public.lead_scoring_config;
create policy "service role delete lead scoring config" on public.lead_scoring_config as permissive for delete to public
  using ((auth.role() = 'service_role'::text));

drop policy if exists "service role insert lead scoring config" on public.lead_scoring_config;
create policy "service role insert lead scoring config" on public.lead_scoring_config as permissive for insert to public
  with check ((auth.role() = 'service_role'::text));

drop policy if exists "service role select lead scoring config" on public.lead_scoring_config;
create policy "service role select lead scoring config" on public.lead_scoring_config as permissive for select to public
  using ((auth.role() = 'service_role'::text));

drop policy if exists "service role update lead scoring config" on public.lead_scoring_config;
create policy "service role update lead scoring config" on public.lead_scoring_config as permissive for update to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

-- ── waitlist ────────────────────────────────────────────────────

drop policy if exists "Service role full access to waitlist" on public.waitlist;
create policy "Service role full access to waitlist" on public.waitlist as permissive for all to public
  using ((auth.role() = 'service_role'::text))
  with check ((auth.role() = 'service_role'::text));

commit;
