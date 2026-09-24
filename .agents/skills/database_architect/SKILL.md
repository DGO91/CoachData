---
name: database_architect
description: Esquema de Supabase/Postgres, migraciones y RLS de este repo. Úsalo al crear o modificar una migración, al añadir una tabla o columna, al escribir políticas RLS, o antes de asumir que una columna existe. NO uses Prisma ni ningún ORM aquí.
---

# Database Architect

## Supabase directo. Nunca Prisma

Este proyecto **no usa Prisma ni ningún ORM**: 0 referencias, sin
`schema.prisma`. Se habla con Supabase mediante `@supabase/supabase-js` y se
migra con SQL plano en `supabase/migrations/`. Si una skill global sugiere
Prisma, no aplica aquí.

## Verifica el esquema contra la base, no contra el código

La lección más cara de este repo: en una auditoría, uno de los siete problemas
"críticos" resultó ser falsa alarma — el código estático sugería un fallo que
la base real ya tenía mitigado. Y al revés: hay migraciones en el repo que
**nunca se aplicaron**.

Antes de escribir una consulta que dependa de una columna, compruébala:

```js
const { data, error } = await supabase.from('<tabla>').select('*').limit(1);
console.log(Object.keys(data?.[0] ?? {}), error);
```

## Migraciones

- Numeradas y correlativas en `supabase/migrations/`. Varias del repo están
  sin trackear en git — confirma cuáles se han aplicado antes de añadir la
  siguiente.
- **Idempotentes**: `create table if not exists`, `drop policy if exists`
  antes de `create policy`, `add column if not exists`.
- Si tocas una tabla que puede no existir todavía, guárdala con
  `to_regclass('public.<tabla>') is not null` en vez de asumir.
- Un script de recuperación puntual no va en la secuencia de migraciones: se
  aparta (ver `scripts/one-off-recovery/`).

## RLS

Toda tabla con datos de cliente lleva `organization_id` y RLS activo, con
políticas que comprueban la **membresía**:

```sql
create policy "miembros ven su organizacion" on public.<tabla>
  for select using (
    organization_id in (
      select organization_id from public.organization_memberships
      where user_id = auth.uid()
    )
  );
```

Pero recuerda que **el backend usa `service_role`, que bypassa RLS**. RLS
protege al cliente que habla directo con Supabase (el frontend); al backend lo
protege únicamente el `.eq('organization_id', req.tenant.id)` que escribas.
Las dos capas hacen falta. Ver `tenant_isolation_guard`.

## Convivencia de los dos modelos

`organizations`/`organization_memberships` es el modelo bueno.
`tenants`/`client_provider_keys` es el legacy y sigue vivo (el Security Vault
depende de él). No borres el viejo sin migrar lo que cuelga de él.

## Nunca

- Desactivar RLS para "que funcione" — hay scripts archivados como
  `.DEPRECATED` precisamente por eso.
- Poner credenciales de base de datos en el chat o en un archivo versionado.
- Dar una migración por aplicada sin haberlo comprobado.
