-- 033_rls_auth_role_una_vez_por_consulta.sql
--
-- Continúa la 032. Aquella envolvió `auth.uid()` en 47 políticas; quedaron
-- fuera las 14 que llaman a `auth.role()`, misma familia de funciones y mismo
-- problema: sin el subselect Postgres las trata como volátiles y las evalúa
-- UNA VEZ POR FILA examinada. Envueltas en `(select auth.role())` el
-- planificador las resuelve como InitPlan, una sola vez por consulta.
--
-- Son 14 políticas en 8 tablas: agent_schedules, las cuatro canonical_*,
-- client_intelligence_vault, lead_scoring_config y waitlist. Todas tienen la
-- misma forma: `auth.role() = 'service_role'`.
--
-- El cambio es de rendimiento, no de permisos: la condición evaluada es la
-- misma y cada política conserva su comando, sus roles y su carácter
-- permisivo. El DDL no se transcribió a mano, se generó desde `pg_policies`.
--
-- Control: la huella md5 normalizada de las 149 políticas del esquema —que
-- iguala `auth.*()` esté envuelto o no— debe ser la misma antes y después.
-- Después de aplicar: 091f6405d2951205ffeabfb54b9df574
--
-- OJO al normalizar, porque cuesta una hora de confusión: Postgres NO guarda
-- el subselect tal como se escribe. `(select auth.role())` se almacena como
-- `( SELECT auth.role() AS role)` —SELECT en mayúsculas y con un alias
-- añadido—. Una normalización que busque 'select ' en minúscula o que no
-- contemple el alias dará por SIN ENVOLVER justo las que sí lo están, y la
-- huella cambiará aunque no haya cambiado nada. El patrón que funciona es:
--   regexp_replace(qual, '\(\s*select\s+(auth\.[a-z_]+)\(\)\s+as\s+[a-z_]+\s*\)', '\1()', 'gi')
--
-- Referencia: https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations

begin;

-- ── agent_schedules ─────────────────────────────────────────────

drop policy if exists "service role full access agent schedules" on public.agent_schedules;
create policy "service role full access agent schedules" on public.agent_schedules as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── canonical_contact ───────────────────────────────────────────

drop policy if exists "service role full access contacts" on public.canonical_contact;
create policy "service role full access contacts" on public.canonical_contact as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── canonical_form_entry ────────────────────────────────────────

drop policy if exists "service role full access form entries" on public.canonical_form_entry;
create policy "service role full access form entries" on public.canonical_form_entry as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── canonical_payment ───────────────────────────────────────────

drop policy if exists "service role full access payments" on public.canonical_payment;
create policy "service role full access payments" on public.canonical_payment as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── canonical_session ───────────────────────────────────────────

drop policy if exists "service role full access sessions" on public.canonical_session;
create policy "service role full access sessions" on public.canonical_session as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── client_intelligence_vault ───────────────────────────────────

drop policy if exists "service_role delete intelligence vault" on public.client_intelligence_vault;
create policy "service_role delete intelligence vault" on public.client_intelligence_vault as permissive for delete to public
  using (((select auth.role()) = 'service_role'::text));

drop policy if exists "service_role insert intelligence vault" on public.client_intelligence_vault;
create policy "service_role insert intelligence vault" on public.client_intelligence_vault as permissive for insert to public
  with check (((select auth.role()) = 'service_role'::text));

drop policy if exists "service_role select intelligence vault" on public.client_intelligence_vault;
create policy "service_role select intelligence vault" on public.client_intelligence_vault as permissive for select to public
  using (((select auth.role()) = 'service_role'::text));

drop policy if exists "service_role update intelligence vault" on public.client_intelligence_vault;
create policy "service_role update intelligence vault" on public.client_intelligence_vault as permissive for update to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── lead_scoring_config ─────────────────────────────────────────

drop policy if exists "service role delete lead scoring config" on public.lead_scoring_config;
create policy "service role delete lead scoring config" on public.lead_scoring_config as permissive for delete to public
  using (((select auth.role()) = 'service_role'::text));

drop policy if exists "service role insert lead scoring config" on public.lead_scoring_config;
create policy "service role insert lead scoring config" on public.lead_scoring_config as permissive for insert to public
  with check (((select auth.role()) = 'service_role'::text));

drop policy if exists "service role select lead scoring config" on public.lead_scoring_config;
create policy "service role select lead scoring config" on public.lead_scoring_config as permissive for select to public
  using (((select auth.role()) = 'service_role'::text));

drop policy if exists "service role update lead scoring config" on public.lead_scoring_config;
create policy "service role update lead scoring config" on public.lead_scoring_config as permissive for update to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

-- ── waitlist ────────────────────────────────────────────────────

drop policy if exists "Service role full access to waitlist" on public.waitlist;
create policy "Service role full access to waitlist" on public.waitlist as permissive for all to public
  using (((select auth.role()) = 'service_role'::text))
  with check (((select auth.role()) = 'service_role'::text));

commit;
