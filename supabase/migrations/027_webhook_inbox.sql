-- supabase/migrations/027_webhook_inbox.sql
--
-- Buzón de eventos entrantes.
--
-- Hoy el router de webhooks normaliza y escribe en el modelo canónico dentro del
-- propio request: `await dispatcher.dispatch(...)` con la petición del proveedor
-- todavía abierta. Si Supabase tarda o falla, el proveedor recibe un error y el
-- evento depende de que él reintente — y no todos reintentan. Un pago que no
-- llega al panel de finanzas destruye la confianza en el producto entero.
--
-- Con este buzón el webhook hace una sola cosa: validar la firma, guardar el
-- evento crudo y responder 200. Un consumidor aparte normaliza después. Eso da
-- reintentos, permite reprocesar un día completo si un conector tenía un fallo
-- de mapeo, y separa "lo recibí" de "lo entendí" — que son dos cosas distintas y
-- hoy están mezcladas.
--
-- Se guarda el cuerpo crudo además del JSON porque la firma se calcula sobre los
-- bytes exactos: sin ellos no se puede volver a verificar un evento archivado.

create table if not exists public.webhook_inbox (
    id uuid primary key default gen_random_uuid(),

    -- Puede ser null: el tenant llega en la URL como texto y se resuelve al
    -- procesar. Guardar el evento no debe depender de que esa resolución
    -- funcione, o volvemos a perder eventos por el mismo motivo.
    organization_id uuid references public.organizations(id) on delete cascade,
    tenant_ref      text not null,

    provider   text not null,
    payload    jsonb not null,
    raw_body   text,
    signature  text,

    -- pending → processing → processed | failed | discarded
    status     text not null default 'pending',
    attempts   integer not null default 0,
    last_error text,

    received_at  timestamptz not null default now(),
    processed_at timestamptz,

    -- Huella del evento para no procesar dos veces el mismo reintento del
    -- proveedor. Se calcula en la aplicación a partir del identificador propio
    -- del evento cuando existe, y del cuerpo cuando no.
    fingerprint text
);

-- Un mismo evento reenviado por el proveedor entra una sola vez.
create unique index if not exists idx_webhook_inbox_fingerprint
    on public.webhook_inbox(provider, fingerprint)
    where fingerprint is not null;

-- El consumidor pregunta siempre por lo pendiente, en orden de llegada. Índice
-- parcial: lo ya procesado no estorba en la búsqueda por mucho que se acumule.
create index if not exists idx_webhook_inbox_pendientes
    on public.webhook_inbox(received_at)
    where status in ('pending', 'failed');

create index if not exists idx_webhook_inbox_org on public.webhook_inbox(organization_id);

alter table public.webhook_inbox enable row level security;

-- Sólo el backend escribe aquí, con service_role, que no pasa por RLS. La
-- política de lectura existe para que un miembro pueda ver el estado de sus
-- propias integraciones desde la aplicación, no para escribir.
drop policy if exists "org_members_read_inbox" on public.webhook_inbox;
create policy "org_members_read_inbox" on public.webhook_inbox
    for select to authenticated
    using (organization_id in (select private.user_org_ids()));

comment on table public.webhook_inbox is
    'Eventos entrantes de proveedores externos, tal como llegaron. El webhook sólo escribe aquí; la normalización al modelo canónico la hace un consumidor aparte.';
