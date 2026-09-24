-- 036_cerrar_tablas_solo_backend.sql
--
-- `tenant_weekly_settings` y `billing_plans` tienen RLS activa y CERO políticas.
-- En Postgres eso deniega todo, así que hoy ningún usuario con JWT puede
-- leerlas ni escribirlas. No se nota porque las dos se usan sólo desde el
-- backend con `service_role`, que se salta RLS: es el mismo disfraz que ya
-- escondió la 026 y la 028.
--
-- La salida no es inventarles políticas para un acceso que nadie hace, sino
-- cerrarlas a la API pública, que es lo que refleja cómo se usan:
--
--   tenant_weekly_settings — la lee y escribe src/agents/weekly_digest/server.js
--                            con getSupabaseClient(), es decir service_role.
--                            Ningún fichero del frontend la toca.
--   billing_plans          — cero filas y ningún fichero del repositorio la
--                            menciona. Queda cerrada igual; si algún día se
--                            usa, se le darán políticas entonces.
--
-- Los privilegios están concedidos directamente a `anon` y `authenticated`, no
-- heredados de PUBLIC, así que revocar de esos dos roles basta y no alcanza a
-- `service_role`. Se comprobó con aclexplode() antes de escribir esto: es el
-- error de la 028 —revocar de PUBLIC y dejar sin permiso a quien sí lo
-- necesitaba— y no se repite aquí.
--
-- OJO: el advisor SIGUE marcando `rls_enabled_no_policy` en las dos, y es
-- correcto que lo haga. Ese linter mira si hay RLS activa sin políticas, no
-- quién tiene privilegios de tabla, así que revocar los grants no lo calla. Se
-- comprobó después de aplicar: los siete avisos de seguridad siguen ahí.
--
-- No se añaden políticas para silenciarlo. Una política inventada para un
-- acceso que nadie hace es peor que un aviso informativo: da por bueno un
-- camino que no está pensado. Y desactivar RLS tampoco: si mañana alguien
-- vuelve a conceder privilegios a `authenticated`, RLS activa sin políticas es
-- lo que mantiene la tabla cerrada. El aviso es de nivel INFO y queda como
-- recordatorio de que estas dos tablas son de backend.

begin;

revoke all on public.tenant_weekly_settings from anon, authenticated;
revoke all on public.billing_plans from anon, authenticated;

-- Explícito aunque ya lo tenga: si mañana alguien revoca de PUBLIC en bloque,
-- esta línea es la que evita repetir la 028.
grant all on public.tenant_weekly_settings to service_role;
grant all on public.billing_plans to service_role;

commit;
