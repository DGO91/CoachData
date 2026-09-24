-- ==============================================================================
-- COACHDATA CORE (THE LUCKY METHOD ENGINE) - MULTI-TENANT SQL SCHEMA
-- ==============================================================================
-- Este script prepara la base de datos para la nueva arquitectura.
-- ADVERTENCIA: Ejecutar este script creará las nuevas tablas necesarias.

-- 1. Tabla de Clientes (Tenants)
-- Representa a tus clientes (ej. Lilly). Ellos NO inician sesión en Supabase directamente
-- si usas un sistema administrado, pero sí los relacionamos con su Auth User si les das acceso al Dashboard.
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Para que puedan entrar al Client Dashboard
    company_name VARCHAR(100) NOT NULL,
    primary_contact_email VARCHAR(150) NOT NULL,
    market_language VARCHAR(5) DEFAULT 'en', -- 'en' / 'es'
    active_package VARCHAR(50) NOT NULL,     -- ej. 'The Effortless Launch'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Variables de Entorno de Proveedores (Encriptada)
-- Guarda las API Keys de Stripe, Flodesk, etc. por cliente.
CREATE TABLE IF NOT EXISTS client_provider_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL,       -- ej. 'crm', 'payment', 'invoice'
    provider_name VARCHAR(50) NOT NULL,       -- ej. 'flodesk', 'stripe'
    api_key_encrypted TEXT NOT NULL,          -- Cifrado en backend (AES-256)
    api_url_custom TEXT,                      -- Subdominios dedicados si aplica
    webhook_secret_token TEXT,                -- Para validar webhooks entrantes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla General de Contactos / Leads Calificados (Fase 1 y Fase 3)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    lead_score INT DEFAULT 0,                 
    lifecycle_status VARCHAR(50) DEFAULT 'lead', -- 'lead', 'qualified', 'client'
    source VARCHAR(100),                      -- 'Organic', 'AI Scraper', 'Ads'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

-- 4. Tabla de Tareas del AI Chief of Staff (Fase 2)
CREATE TABLE IF NOT EXISTS ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL, -- 'morning_brief', 'inbox_sort', 'pre_call'
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)
-- Los administradores (tú) pueden verlo todo mediante la Service Role Key en el backend.
-- Los clientes (auth_user_id) solo pueden leer sus propios datos para alimentar su Dashboard.

CREATE POLICY "Tenants can view own profile" 
ON tenants FOR SELECT 
USING (auth.uid() = auth_user_id);

CREATE POLICY "Tenants can view own provider keys" 
ON client_provider_keys FOR SELECT 
USING (tenant_id IN (SELECT id FROM tenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tenants can view own contacts" 
ON contacts FOR SELECT 
USING (tenant_id IN (SELECT id FROM tenants WHERE auth_user_id = auth.uid()));

CREATE POLICY "Tenants can view own AI tasks" 
ON ai_tasks FOR SELECT 
USING (tenant_id IN (SELECT id FROM tenants WHERE auth_user_id = auth.uid()));

-- Opcional: Eliminar la tabla antigua si ya no se usa (descomentar si estás seguro)
-- DROP TABLE IF EXISTS user_credentials;
