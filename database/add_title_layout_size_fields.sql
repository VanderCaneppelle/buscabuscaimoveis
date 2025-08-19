-- =====================================================
-- ADICIONAR CAMPOS DE LAYOUT E TAMANHO DO TÍTULO
-- =====================================================

-- Adicionar campos de layout e tamanho do título à tabela stories
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS title_layout TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS title_size TEXT DEFAULT 'medium';

-- Adicionar comentários explicativos
COMMENT ON COLUMN stories.title_layout IS 'Layout do título: center, left, right';
COMMENT ON COLUMN stories.title_size IS 'Tamanho do título: small, medium, large';

-- Verificar se a alteração foi aplicada
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name IN ('title_layout', 'title_size');

-- Mostrar alguns exemplos de stories existentes
SELECT 
    id,
    title,
    title_layout,
    title_size,
    created_at
FROM stories
ORDER BY created_at DESC
LIMIT 5;
