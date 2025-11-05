-- =====================================================
-- ADICIONAR CAMPO VIDEO_URLS À TABELA PROPERTIES
-- =====================================================

-- Adicionar campo video_urls à tabela properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS video_urls TEXT[];

-- Adicionar comentário explicativo
COMMENT ON COLUMN properties.video_urls IS 'Array de URLs de vídeos do YouTube para o anúncio';

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name = 'video_urls';

