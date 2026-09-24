-- 038_rollback.sql — deshace 038_borrar_residuos_de_pruebas.sql
--
-- Recrea las filas con los valores que tenían el 19 de agosto de 2026, tomados
-- de la base antes de borrarlas. No recupera nada que dependiera de ellas y no
-- se hubiera detectado: es una reconstrucción, no una restauración.
--
-- El usuario de auth NO se recrea aquí. Crear filas en auth.users a mano deja
-- una cuenta sin identidad ni credenciales, que Supabase Auth trata distinto de
-- una creada por su API. Si hiciera falta de verdad, lo correcto es darla de
-- alta por la API de Auth y no por SQL.

begin;

insert into public.tenant_weekly_settings (tenant_id, settings, feedback, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  '{"cronHour": 8, "language": "en", "userName": "Elsi", "trelloKey": "", "cronMinute": 0, "notionToken": "", "trelloToken": "", "trelloBoardId": "", "googleSheetsId": "", "preferred_name": "", "scheduleActive": false, "custom_keywords": "", "selected_topics": ["Business"], "useGoogleSheets": false, "notionDatabaseId": "", "selected_regions": ["Global", "Europe"], "lastExecutionTime": "2026-07-16T17:41:31.836Z", "useGoogleCalendar": false, "custom_news_sources": [], "lastExecutionSuccess": true, "selected_news_sources": ["entrepreneur.com"]}'::jsonb,
  '[]'::jsonb,
  '2026-07-16T17:42:17.61+00:00'
) on conflict do nothing;

insert into public.waitlist (id, email, name, role, source, locale, created_at, contacted_at)
values ('23c97a13-3581-4022-bfc2-6b456d04160e', 'persona_1786635029594@ejemplo.com',
        'Persona Test', 'coach', 'landing', 'es', '2026-08-13T15:30:29.746+00:00', null)
on conflict do nothing;

insert into public.tenants (id, auth_user_id, company_name, primary_contact_email,
                            market_language, active_package, created_at, updated_at, organization_id)
values
 ('c829a4df-f3a1-4fdc-8629-a851fbef7b2c', null, 'efimero-b-1787122883313@coachdata.test',
  'efimero-b-1787122883313@coachdata.test', 'en', 'Free Tier',
  '2026-08-19T07:01:25.427782+00:00', '2026-08-19T07:01:25.427782+00:00', null),
 ('2f2d06bc-80d7-4689-a3f1-59e0debe0252', null, 'efimero-b-1787123234350@coachdata.test',
  'efimero-b-1787123234350@coachdata.test', 'en', 'Free Tier',
  '2026-08-19T07:07:16.828577+00:00', '2026-08-19T07:07:16.828577+00:00', null)
on conflict do nothing;

commit;
