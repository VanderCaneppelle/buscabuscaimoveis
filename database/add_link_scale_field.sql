-- =====================================================
-- ADICIONAR CAMPO DE ESCALA DO LINK
-- =====================================================

-- Adicionar campo link_scale
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS link_scale DECIMAL(3,2) DEFAULT 1.0;

-- Adicionar comentário explicativo
COMMENT ON COLUMN stories.link_scale IS 'Escala do link: 0.5 a 2.0 (50% a 200%)';

-- Verificar se a alteração foi aplicada
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'link_scale';

-- Mostrar alguns exemplos de stories existentes
SELECT 
    id,
    title,
    link_url,
    title_scale,
    link_scale,
    created_at
FROM stories
ORDER BY created_at DESC
LIMIT 5;
