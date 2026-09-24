# CoachData Supabase Migration Index

Este archivo representa el índice maestro secuencial para la reconstrucción completa y reproducible de la base de datos de CoachData Operational OS v2.

---

## 🔐 Identity & Access Layer
- **`001_security_patch.sql`**: Tablas core de tenants (`organizations`, `users`, `organization_memberships`) y políticas RLS iniciales.
- **`009_membership_recovery.sql`**: Recuperación de membresías owner y restricciones de unicidad `(organization_id, user_id)`.
- **`010_tenant_onboarding_hardening.sql`**: Función transaccional `tenant_onboarding_wizard()` para aprovisionamiento sin usuarios huérfanos.

---

## ⚙️ Core Infrastructure & Automation Layer
- **`002_ai_agent_logs.sql`**: Auditoría de logs de inteligencia artificial y orquestación de agentes V2.
- **`003_updated_at_triggers.sql`**: Función global `set_updated_at()` y triggers automáticos de timestamp.
- **`007_file_storage_engine.sql`**: Tablas y políticas para almacenamiento seguro de activos y archivos.
- **`011_organization_ai_settings.sql`**: Configuración multi-tenant de agentes de IA y personalización por organización.

---

## 💼 Operational & Task Layer
- **`004_task_activity_history.sql`**: Tareas operativas y registro histórico de cambios.
- **`005_client_workspace_rls.sql`**: Espacios de trabajo dedicados a clientes finales y entregables.
- **`006_client_action_audit.sql`**: Auditoría de interacciones de clientes en el portal.

---

## 💰 Revenue Operations Layer
- **`008_revenue_crm_schema.sql`**: Tablas de ventas nativas (`crm_companies`, `crm_contacts`, `crm_deals`, `proposals`, `contracts`, `invoices`, `automation_jobs`).

## 🔧 Correcciones
- **`025_tenant_onboarding_wizard_idempotente.sql`**: la función de onboarding creaba una organización nueva en cada llamada. Como la invoca `tenantContextMiddleware` en toda petición autenticada de un usuario sin membresías, un registro reciente podía acabar con varias organizaciones y quedar bloqueado por el 400 de "pertenece a múltiples organizaciones". Ahora devuelve la existente y serializa por usuario con un advisory lock.
- **`026_rls_politicas_faltantes.sql`**: 42 tablas tenían RLS activa y sólo 18 alguna política — en Postgres eso significa denegar todo, y no se notaba porque el backend consulta con `service_role`, que bypassa RLS. Escribe las políticas de las 24 restantes sobre `private.user_org_ids()`, `private.is_org_owner()` y `private.org_teammate_ids()`, funciones `SECURITY DEFINER` que evitan la recursión al consultar `organization_memberships` desde las políticas de esa misma tabla. Es aditiva: no cambia el comportamiento mientras el backend siga usando `service_role`.
- **`027_webhook_inbox.sql`**: buzón de eventos entrantes. El router de webhooks normalizaba dentro de la propia petición del proveedor, así que un fallo de la base de datos devolvía error y el evento sólo sobrevivía si el proveedor reintentaba. Ahora el webhook guarda y responde 200; un consumidor normaliza después, con reintentos y tope. Índice único por huella para que un reenvío no se procese dos veces.
- **`028_grant_execute_helpers_rls.sql`**: corrige la 026. El `revoke execute ... from public` dejó sin permiso también a `authenticated`, y como las políticas invocan esas funciones con los privilegios de quien consulta, toda consulta hecha con el JWT de un usuario fallaba con *permission denied for function user_org_ids*. No se notaba porque el backend usa `service_role`; lo detectó el control positivo de `test-rls-user-scoped.js`, que exige que el dueño SÍ vea lo suyo.
- **`029_cerrar_funciones_expuestas.sql`**: fija `search_path` en `is_org_member` y `get_auth_user_organizations`, e intenta cerrarlas a `anon`. **No lo consiguió**: revocar del rol concreto no elimina el permiso que se hereda de `PUBLIC`.
- **`030_revocar_public_en_funciones.sql`**: lo corrige revocando de `PUBLIC` y devolviendo `EXECUTE` explícitamente a `authenticated` y `service_role`. Sin esa segunda mitad se repetiría el fallo de la 026: 62 políticas de RLS invocan esas funciones y se evalúan con los privilegios de quien consulta.
- **`031_wizard_solo_backend.sql`**: `tenant_onboarding_wizard` conservaba una concesión directa a `authenticated` y crea organizaciones. Queda sólo para `service_role`, que es quien la invoca desde tenantContextMiddleware.
- **`032_rls_auth_uid_una_vez_por_consulta.sql`**: 47 políticas de 24 tablas llamaban `auth.uid()` sin envolver, así que Postgres lo trataba como volátil y lo evaluaba una vez por fila examinada en lugar de una por consulta. Envueltas en `(select auth.uid())`, el planificador las resuelve como InitPlan. No cambia permisos: la condición es la misma. Se verificó con una huella md5 de las 149 políticas del esquema, normalizando el envoltorio — idéntica antes y después. Añade además `idx_tenants_auth_user_id`, que faltaba y lo usan las políticas de `ai_tasks` y `contacts`. La reversión está en `supabase/rollback/032_rollback.sql`.

- **`040_set_updated_at_search_path.sql`**: fija `search_path = ''` en el trigger `set_updated_at`, el último aviso `function_search_path_mutable` de los advisors. El cuerpo solo usa `NOW()`, de `pg_catalog`; se comprobó en una transacción deshecha que el trigger sigue actualizando `updated_at`.
---

## Estado de aplicación en producción

Comprobado el 2026-08-19 contra el esquema real del proyecto, no contra lo que
dice este repositorio. Importa la distinción: **versionada no es lo mismo que
aplicada**, y durante meses no coincidieron.

`supabase.migrations` estaba **vacía**: todo se había ejecutado a mano desde el
editor SQL, así que Supabase no tenía constancia de ninguna migración. Por eso
`supabase db push` era peligroso — habría intentado aplicarlas todas desde cero.
Desde la 012 en adelante se aplican con registro.

### Aplicadas

`001`–`003`, `008`–`010`, `012`–`014`, `016`–`024`, `025`–`032`, `033`–`040` (estas últimas comprobadas en `supabase_migrations` el 2026-09-19).

### NO aplicadas — sus tablas no existen

La `024` estaba aquí hasta el 2026-08-18. Se aplicó porque `/api/agents/memory`
devolvía 500 al consultar `client_intelligence_vault`: la ruta estaba montada y
en uso, así que la tabla dejó de ser opcional.

| Migración | Tablas que definiría | Por qué sigue sin aplicarse |
|---|---|---|
| `004` | `task_activity_history` | Project Desk, superficie oculta desde la fase 01 |
| `005` | `client_project_access` | Portal de cliente |
| `006` | `client_action_audit` | Portal de cliente |
| `007` | `client_files`, `client_deliverables` | Portal de cliente |
| `011` | `organization_ai_settings` | Los ajustes de IA funcionan hoy sin esta tabla |

Cuatro de las cinco pertenecen a zonas del producto que están apagadas. **No se
aplican a propósito**: crear tablas para superficies que quizá se eliminen es
justo lo que la auditoría señaló como problema de fondo. Si dentro de unos meses
nadie las echa en falta, estas migraciones se borran en vez de aplicarse.

### Tablas que existen y ninguna migración define

`profiles`, `user_credentials`, `contacts`, `ai_tasks`, `knowledge_documents`,
`tenant_weekly_settings`, `billing_plans`.

Son heredadas de cuando el esquema se construía a mano. `profiles` es la más
relevante: la usa `delete_own_user`, se rellena sola al crear un usuario, y por
no estar en ninguna migración se olvidó en la primera versión de la limpieza de
identidades, que dejó 22 perfiles huérfanos.

