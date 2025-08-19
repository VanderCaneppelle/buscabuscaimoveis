-- =====================================================
-- ADICIONAR CAMPOS DE POSICIONAMENTO À TABELA STORIES
-- =====================================================

-- Adicionar campos de posicionamento à tabela stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS link_position TEXT DEFAULT 'bottom-right',
ADD COLUMN IF NOT EXISTS title_position TEXT DEFAULT 'bottom-center';

-- Adicionar comentários explicativos
COMMENT ON COLUMN stories.link_position IS 'Posição do link no story (top-left, top-right, bottom-left, bottom-right)';
COMMENT ON COLUMN stories.title_position IS 'Posição do título no story (top-center, center, bottom-center)';

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name IN ('link_position', 'title_position');

-- Verificar estrutura completa da tabela stories
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories'
ORDER BY ordinal_position;

-- Exemplo de uso:
-- INSERT INTO stories (title, image_url, media_type, link_url, link_text, link_position, title_position)
-- VALUES ('Meu Story', 'https://...', 'image', 'https://wa.me/5511999999999', 'Fale conosco', 'bottom-right', 'top-center');
