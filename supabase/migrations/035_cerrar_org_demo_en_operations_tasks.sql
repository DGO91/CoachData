-- 035_cerrar_org_demo_en_operations_tasks.sql
--
-- `org_isolation_tasks` es permisiva, `to public` y de comando ALL, y su
-- condición empieza por una rama que no comprueba identidad ninguna:
--
--     organization_id = '00000000-0000-0000-0000-000000000001'
--
-- Es decir: cualquiera —`anon` incluido, que tiene SELECT, INSERT, UPDATE y
-- DELETE sobre la tabla— podía leer y escribir las filas de esa organización.
-- Esta migración retira esa rama y deja sólo la comprobación de membresía.
--
-- ¿Por qué no se ha explotado? Por dos accidentes, y ninguno es una defensa:
--   1. La organización no existe y `operations_tasks` está vacía (0 filas).
--   2. Las otras políticas de la tabla llaman a `get_auth_user_organizations()`,
--      sobre la que `anon` no tiene EXECUTE, así que su consulta reventaba con
--      `permission denied` antes de devolver nada.
-- El segundo es el peligroso: desaparece en cuanto se consoliden las políticas
-- duplicadas —el trabajo de los 146 avisos `multiple_permissive_policies`— y
-- entonces la rama del literal quedaría sola y sí concedería acceso. Esta
-- migración tiene que ir ANTES de aquella.
--
-- Ese UUID es un valor de prueba que se coló en producción. Aparece como
-- organización ficticia en seis tests y, lo que importa más, como valor por
-- defecto en código vivo: `CommandPalette` lo usa cuando no recibe
-- `organizationId` —y `App.jsx` no se lo pasa nunca— y cuatro conectores
-- (Kajabi, Calendly, Tally, Stripe) lo usan como `organizationId || <este>`.
-- Nada de eso deja de funcionar al cerrar la política: los conectores corren
-- con `service_role`, que se salta RLS, y la paleta ya devolvía vacío porque la
-- tabla lo está. Pero ambos usos son bugs por su cuenta y están anotados como
-- pendientes; esta migración no los arregla.
--
-- La política conserva nombre, comando, roles y carácter permisivo. Lo único
-- que cambia es que se le quita la rama incondicional.
--
-- Control: tras aplicarla, ninguna política de `operations_tasks` debe
-- mencionar el literal, y las suites de aislamiento deben seguir pasando con su
-- control positivo.

begin;

drop policy if exists "org_isolation_tasks" on public.operations_tasks;

create policy "org_isolation_tasks" on public.operations_tasks as permissive for all to public
  using ((organization_id IN ( SELECT organization_memberships.organization_id
     FROM organization_memberships
    WHERE (organization_memberships.user_id = ( SELECT auth.uid() AS uid)))))
  with check ((organization_id IN ( SELECT organization_memberships.organization_id
     FROM organization_memberships
    WHERE (organization_memberships.user_id = ( SELECT auth.uid() AS uid)))));

commit;
