-- ====================================================================
-- SCRIPT PARA RESOLVER ALERTAS DE SEGURIDAD EN SUPABASE
-- Corre este script en el SQL Editor de tu Supabase Dashboard.
-- ====================================================================

-- 1. SOLUCIÓN A "Extension in Public" (public.vector)
-- Supabase recomienda mover las extensiones a su propio esquema para no contaminar 'public'.
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- 2. SOLUCIÓN A "Public / Signed-In Users Can Execute SECURITY DEFINER Function"
-- Por defecto en PostgreSQL, las funciones tienen permiso de ejecución para el rol PUBLIC.
-- Revocamos el acceso general:
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_own_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_own_user() FROM anon;

-- Si 'delete_own_user' se llama desde tu aplicación web (React) para que un usuario se elimine,
-- SÍ necesita permiso para usuarios autenticados:
GRANT EXECUTE ON FUNCTION public.delete_own_user() TO authenticated;

-- 3. Proteger las funciones SECURITY DEFINER contra "Search Path Hijacking"
-- (Esto también suele ser requerido por el Security Advisor de Supabase para quitar el Warning)
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.delete_own_user() SET search_path = public;
