-- ==============================================================================
-- FUNCIÓN PARA LA ELIMINACIÓN AUTÓNOMA DE CUENTA Y DATOS EN CASCADA
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu consola de Supabase.
-- Esta función permite a los usuarios borrar por completo su cuenta y todos
-- sus datos asociados de forma definitiva.

CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Necesario para poder interactuar y eliminar registros de la tabla interna auth.users
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Obtener el ID del usuario actualmente autenticado en Supabase
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debes iniciar sesión para realizar esta acción.';
    END IF;

    -- 1. Eliminar de la tabla pública de perfiles (public.profiles)
    DELETE FROM public.profiles WHERE id = current_user_id;

    -- 1.5. Eliminar los documentos almacenados para el sistema RAG (knowledge_documents)
    -- correspondientes al tenant del usuario
    DELETE FROM public.knowledge_documents 
    WHERE metadata->>'tenant_id' = (
        SELECT id::text FROM public.tenants WHERE auth_user_id = current_user_id
    );

    -- 2. Eliminar de la tabla de clientes (public.tenants)
    -- Debido a la restricción ON DELETE CASCADE, esto eliminará automáticamente:
    --   - client_provider_keys (llaves y credenciales de APIs)
    --   - contacts (leads y contactos calificados)
    --   - ai_tasks (tareas e informes del Chief of Staff)
    DELETE FROM public.tenants WHERE auth_user_id = current_user_id;

    -- 3. Eliminar el usuario de la autenticación interna (auth.users)
    -- Esto borra al usuario del sistema de autenticación de Supabase y destruye su sesión
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;
