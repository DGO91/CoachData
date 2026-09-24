-- 037_rollback.sql — deshace 037_reconectar_tenants_huerfanos.sql
--
-- Devuelve los tres tenants a `organization_id` y `auth_user_id` nulos, es
-- decir, al estado en que sus credenciales eran inalcanzables. Sólo tiene
-- sentido si la reconexión resultara ser incorrecta; lo esperable entonces es
-- corregir a qué organización pertenece cada uno, no volver a dejarlos sueltos.

begin;

update public.tenants set organization_id = null, auth_user_id = null
 where id in (
   '2057aff4-28e4-407a-a543-b301e8af4ae0',
   'f5a4c8ca-a9a2-4dbf-8e43-c272d0a4238d'
 );

update public.tenants set auth_user_id = null
 where id = '25c56167-6abb-4b78-9b62-dedd46c7379c';

commit;
