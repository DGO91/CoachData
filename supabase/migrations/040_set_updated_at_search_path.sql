-- 040_set_updated_at_search_path.sql
--
-- Aviso `function_search_path_mutable` de los advisors de Supabase.
--
-- `set_updated_at` es el trigger que pone `updated_at` en las tablas de la 003,
-- la 008 y la 011. Sin search_path fijo, la función resuelve los nombres con el
-- search_path de quien ejecuta la sentencia que la dispara: alguien que pudiera
-- crear un objeto en un esquema anterior a pg_catalog en ese search_path podría
-- suplantar lo que la función llama.
--
-- Con search_path vacío solo queda pg_catalog, que siempre se busca primero de
-- forma implícita. El cuerpo solo usa NOW(), que vive ahí: no cambia nada de lo
-- que hace.
--
-- Reversible con: ALTER FUNCTION public.set_updated_at() RESET search_path;

ALTER FUNCTION public.set_updated_at() SET search_path = '';
