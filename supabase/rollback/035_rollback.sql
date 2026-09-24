-- 035_rollback.sql — deshace 035_cerrar_org_demo_en_operations_tasks.sql
--
-- Devuelve la rama `organization_id = '00000000-...-0001'` a
-- `org_isolation_tasks`, es decir, **reabre el acceso sin identidad** a esa
-- organización. Sólo tiene sentido si cerrarla rompiera algo que no se previó,
-- y en ese caso lo correcto es arreglar eso y volver a cerrarla, no dejar esto
-- puesto.

begin;

drop policy if exists "org_isolation_tasks" on public.operations_tasks;

create policy "org_isolation_tasks" on public.operations_tasks as permissive for all to public
  using (((organization_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (organization_id IN ( SELECT organization_memberships.organization_id
     FROM organization_memberships
    WHERE (organization_memberships.user_id = ( SELECT auth.uid() AS uid))))))
  with check (((organization_id = '00000000-0000-0000-0000-000000000001'::uuid) OR (organization_id IN ( SELECT organization_memberships.organization_id
     FROM organization_memberships
    WHERE (organization_memberships.user_id = ( SELECT auth.uid() AS uid))))));

commit;
