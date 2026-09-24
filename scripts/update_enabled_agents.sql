-- 1. Actualizar el valor por defecto de enabled_agents para incluir 'knowledge-agent'
ALTER TABLE profiles 
ALTER COLUMN enabled_agents SET DEFAULT '["welcome", "prospect", "email", "mail-responder", "pre-call-agent", "weekly-digest", "auto-plan", "auditor", "evening-summary", "knowledge-agent", "phase1", "phase2", "phase6", "phase7"]'::jsonb;

-- 2. Asegurarse de que todos los perfiles existentes tengan 'knowledge-agent' en su lista
UPDATE profiles
SET enabled_agents = CASE 
  WHEN enabled_agents IS NULL THEN '["welcome", "prospect", "email", "mail-responder", "pre-call-agent", "weekly-digest", "auto-plan", "auditor", "evening-summary", "knowledge-agent", "phase1", "phase2", "phase6", "phase7"]'::jsonb
  WHEN NOT (enabled_agents @> '["knowledge-agent"]'::jsonb) THEN enabled_agents || '["knowledge-agent"]'::jsonb
  ELSE enabled_agents
END;
