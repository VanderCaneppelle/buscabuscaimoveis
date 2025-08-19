-- =====================================================
-- ADICIONAR CAMPOS DE COORDENADAS À TABELA STORIES
-- =====================================================

-- Adicionar campos de coordenadas à tabela stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS link_coordinates TEXT,
ADD COLUMN IF NOT EXISTS title_coordinates TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN stories.link_coordinates IS 'Coordenadas X,Y do link no story (JSON: {"x": 100, "y": 200})';
COMMENT ON COLUMN stories.title_coordinates IS 'Coordenadas X,Y do título no story (JSON: {"x": 100, "y": 200})';

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name IN ('link_coordinates', 'title_coordinates');

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
-- INSERT INTO stories (title, image_url, media_type, link_url, link_text, link_coordinates, title_coordinates)
-- VALUES ('Meu Story', 'https://...', 'image', 'https://wa.me/5511999999999', 'Fale conosco', 
--         '{"x": 150, "y": 300}', '{"x": 50, "y": 100}');
