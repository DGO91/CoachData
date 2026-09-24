# CoachData

Multi-tenant SaaS backend for coaching and consulting practices, built on
Supabase and PostgreSQL. This is a sanitized extract of a private product,
published to show how the data layer is built and secured.

## What this repository shows

**Tenant isolation is enforced in the database.** Every business table
carries `organization_id` and a Row Level Security policy keyed on the
caller's memberships. The application layer composes two middlewares in
order, `authMiddleware` then `tenantContextMiddleware`, and the second one
verifies the membership against the table instead of trusting the header.

**The security migrations carry their own reasoning.** They are numbered
SQL files and each one opens with a comment explaining what was wrong,
why it was dangerous and how to reverse it. A few worth reading:

| Migration | What it fixes |
|---|---|
| `026_rls_politicas_faltantes.sql` | Tables with RLS enabled and no policy |
| `029_cerrar_funciones_expuestas.sql` | Three `SECURITY DEFINER` functions reachable by `anon` through PostgREST |
| `032_rls_auth_uid_una_vez_por_consulta.sql` | `auth.uid()` unwrapped in 47 policies across 24 tables, evaluated once per row instead of once per query |
| `034_indices_cobertura_y_duplicados.sql` | Three identical indexes on one table, and 17 foreign keys with no index |
| `040_set_updated_at_search_path.sql` | `search_path` hijacking on a trigger function |

**Isolation tests carry a positive control.** They assert both that tenant A
cannot see tenant B and that the owner does see their own rows. Without the
second half, a policy that closes too much passes as a success.

## Layout

```
src/backend/       domain, application and infrastructure layers
src/frontend/src/  React 19 client
supabase/migrations/  numbered SQL, applied in order
tests/             isolation and API tests
```

## What was removed before publishing

Credentials, deployment configuration, the agent subsystems, internal
handover documents, and two one-off data repair migrations that referenced
real records. One unit test went with them: it read the source of an agent
that is no longer part of this extract. Comments in the SQL are in Spanish,
as they were written.
