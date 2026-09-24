-- 1. Habilitar la extensión de base de datos vectorial (100% gratuita en Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Crear la tabla de documentos de conocimiento
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(384) -- Dimensión 384 para el modelo Xenova/all-MiniLM-L6-v2
);

-- 3. Crear una función para buscar por similitud (Cosine Similarity)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_tenant_id text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_documents.id,
    knowledge_documents.content,
    knowledge_documents.metadata,
    1 - (knowledge_documents.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents
  WHERE 1 - (knowledge_documents.embedding <=> query_embedding) > match_threshold
    AND (filter_tenant_id IS NULL OR knowledge_documents.metadata->>'tenant_id' = filter_tenant_id)
  ORDER BY knowledge_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
