-- =====================================================
-- ATUALIZAR CAMPO DE ESCALA DO TÍTULO
-- =====================================================

-- Remover campo antigo title_size se existir
ALTER TABLE stories DROP COLUMN IF EXISTS title_size;

-- Adicionar campo title_scale
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS title_scale DECIMAL(3,2) DEFAULT 1.0;

-- Adicionar comentário explicativo
COMMENT ON COLUMN stories.title_scale IS 'Escala do título: 0.5 a 2.0 (50% a 200%)';

-- Verificar se a alteração foi aplicada
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'title_scale';

-- Mostrar alguns exemplos de stories existentes
SELECT 
    id,
    title,
    title_scale,
    created_at
FROM stories
ORDER BY created_at DESC
LIMIT 5;
