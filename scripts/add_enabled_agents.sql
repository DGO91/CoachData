-- 1. Añadir la columna enabled_agents a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS enabled_agents JSONB DEFAULT '["welcome", "prospect", "email", "mail-responder", "pre-call-agent", "weekly-digest", "auto-plan", "auditor", "evening-summary", "phase1", "phase2", "phase6", "phase7"]'::jsonb;

-- 2. Asegurarse de que los perfiles existentes tengan todos los agentes habilitados por defecto
UPDATE profiles 
SET enabled_agents = '["welcome", "prospect", "email", "mail-responder", "pre-call-agent", "weekly-digest", "auto-plan", "auditor", "evening-summary", "phase1", "phase2", "phase6", "phase7"]'::jsonb 
WHERE enabled_agents IS NULL;
