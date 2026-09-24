---
name: tenant_isolation_guard
description: Aislamiento multi-tenant, RLS y el Security Vault. Úsalo al escribir o revisar cualquier consulta que toque datos de una organización, al montar una ruta nueva en app.js, al tocar políticas RLS o migraciones con organization_id, al manejar credenciales cifradas de cliente, y siempre que verifiques que un tenant no puede ver datos de otro. Fusiona los antiguos rls_security_agent y auth_vault_agent.
---

# Tenant Isolation Guard

Una fuga entre organizaciones es el fallo más caro de este producto: un coach
viendo los clientes de otro. Todo lo de aquí existe para que eso no pase.

## Los dos modelos de tenant conviven

Confundirlos es el error más fácil del repo.

| Modelo | Tablas | Se resuelve con |
|---|---|---|
| **Nuevo** (el bueno) | `organizations` + `organization_memberships` | `tenantContextMiddleware` → `req.tenant` |
| **Legacy** | `tenants` + `client_provider_keys` | `req.user.id`, casando por `id` **o** `auth_user_id` |

En el legacy, `tenants.id` a veces **es** el `auth.users.id` y a veces es
independiente con `auth_user_id` como FK. Cualquier consulta al modelo viejo
tiene que contemplar los dos casos (ver `resolveOwnTenant` en
`tenantVaultRoutes.js`).

## Toda ruta con datos de organización necesita las dos capas

```js
app.use('/api/loquesea', authMiddleware, tenantContextMiddleware, rutas);
```

- `authMiddleware` valida el JWT de Supabase → `req.user`.
- `tenantContextMiddleware` lee la cabecera `x-organization-slug` (o `?org=`),
  comprueba la **membresía** en `organization_memberships` y rellena
  `req.tenant` con `{ id, slug, role, … }`.

Sin la segunda, un usuario autenticado accede a cualquier organización. Con
las dos, filtra siempre por `req.tenant.id` — **nunca** por un id que venga
del body o de la query, que los controla el cliente.

Si la ruta además es de administración, añade `requireOwnerRole`.

## El cliente de Supabase del backend BYPASSA RLS

`getSupabaseClient()` usa `SUPABASE_SERVICE_ROLE_KEY`. Ese cliente **ignora
las políticas RLS por diseño**. Dos consecuencias:

1. En el backend, RLS no te protege: el filtro `.eq('organization_id', req.tenant.id)`
   es lo único que separa a un cliente de otro. Si se te olvida, la fuga es total.
2. **Un test de RLS que use ese cliente no prueba RLS**, prueba el `.eq()` que
   el propio test escribió. El aislamiento se verifica con cliente anon + el
   JWT del usuario real.

## Cómo se verifica de verdad el aislamiento

Un test que consulta un `organization_id` **inexistente** devuelve 0 filas
aunque no haya aislamiento de ningún tipo. No demuestra nada. La prueba válida
necesita las tres piezas:

1. Dos organizaciones **reales con datos dentro**.
2. JWT válido de un usuario miembro de B (no un string inventado: `authMiddleware`
   lo rechaza con 401 antes de llegar al middleware de tenant, y entonces estás
   probando el rechazo de tokens, no el aislamiento).
3. **Prueba negativa de control**: un caso que afirme `data.length > 0` para
   los datos propios. Sin él no puedes distinguir "el aislamiento funciona" de
   "el test no está viendo la base".

## Security Vault

Las credenciales de cliente se cifran con **AES-256-GCM**
(`infrastructure/services/encryptionService.js`), con `ENCRYPTION_MASTER_KEY`
en hex de 64 caracteres. El formato almacenado es `iv:authTag:datos`.

- Nunca devuelvas una clave descifrada al frontend. El frontend solo escribe.
- Nunca registres una clave descifrada en logs.
- Los webhooks entrantes verifican firma con el `webhook_secret_token` del
  tenant: Stripe con `constructEvent()`, Tally con HMAC-SHA256 y
  `crypto.timingSafeEqual`. Fallar cerrado, siempre.

## Antes de dar por cerrada una tarea aquí

```bash
node scripts/governance-check.js
node scripts/test-critical-routes.js
```

Y si tocaste aislamiento, verifica contra la base real con dos usuarios
distintos. La verificación estática no basta: en una auditoría previa, uno de
los siete puntos "críticos" resultó ser falsa alarma porque el código sugería
un fallo que la base ya tenía mitigado. Verifica contra la base, no contra tu
lectura del código.
