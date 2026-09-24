-- ============================================================================
-- CoachData — RLS Isolation Tests
-- ============================================================================

-- Simulación estricta de aislamiento de inquilinos
-- Uso: Cargar este archivo y verificar que todos los ASSERT pasan exitosamente.

BEGIN;

-- 1. Setup Data
-- Asumimos la existencia de 2 organizaciones y 2 usuarios
-- Org A (org_id_a) <-> User A (user_id_a)
-- Org B (org_id_b) <-> User B (user_id_b)

-- 2. Pruebas para User A (Set role to authenticated, set claim user_id to User A)
-- SET LOCAL role = 'authenticated';
-- SET LOCAL request.jwt.claim.sub = 'user_id_a';

-- Prueba A.1: User A puede leer datos de Org A
-- ASSERT (SELECT count(*) FROM crm_contacts WHERE organization_id = 'org_id_a') > 0;

-- Prueba A.2: User A NO puede leer datos de Org B
-- ASSERT (SELECT count(*) FROM crm_contacts WHERE organization_id = 'org_id_b') = 0;

-- Prueba A.3: User A puede insertar en Org A
-- INSERT INTO crm_contacts (organization_id, ...) VALUES ('org_id_a', ...) -> DEBE PASAR

-- Prueba A.4: User A NO puede insertar en Org B
-- INSERT INTO crm_contacts (organization_id, ...) VALUES ('org_id_b', ...) -> DEBE FALLAR (403/RLS)

-- 3. Pruebas inversas para User B
-- SET LOCAL request.jwt.claim.sub = 'user_id_b';
-- ASSERT (SELECT count(*) FROM crm_contacts WHERE organization_id = 'org_id_a') = 0;
-- ASSERT (SELECT count(*) FROM crm_contacts WHERE organization_id = 'org_id_b') > 0;

ROLLBACK;
