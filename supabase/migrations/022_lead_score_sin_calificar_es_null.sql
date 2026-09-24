-- ============================================================================
-- CoachData Operational OS v2 — Un lead sin calificar no tiene puntuación
-- Migration: 022_lead_score_sin_calificar_es_null.sql
-- Compatibility: Supabase PostgreSQL 15 (SaaS Multi-tenant Isolation)
-- ============================================================================
--
-- Problema: 008_revenue_crm_schema.sql declaró `lead_score INTEGER DEFAULT 0`.
-- Un contacto recién creado nace con 0, que en el panel es indistinguible de
-- "la IA lo analizó y le puso 0". Es un dato plausible inventado.
--
-- Regla del proyecto: sin datos, vacío. Un lead sin calificar vale NULL, y
-- `scored_at` es quien dice si la calificación ocurrió de verdad.
--
-- No destructiva: solo se ponen a NULL las filas que nunca fueron calificadas
-- (`scored_at is null`). Ninguna puntuación real se pierde.
-- ============================================================================

-- 1. Los contactos nuevos ya no nacen puntuados.
alter table public.crm_contacts
  alter column lead_score drop default;

-- 2. Las filas que nunca pasaron por el calificador dejan de fingir un 0.
update public.crm_contacts
   set lead_score = null
 where scored_at is null
   and lead_score = 0;

comment on column public.crm_contacts.lead_score is
  'Puntuación 0-100 asignada por el calificador de leads. NULL = sin calificar todavía. Ver scored_at y score_reason.';
