-- =====================================================
-- ADICIONAR CAMPOS DE LINK À TABELA STORIES
-- =====================================================

-- Adicionar campos link_url e link_text à tabela stories
ALTER TABLE stories 
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS link_text TEXT DEFAULT 'Saiba mais';

-- Adicionar comentários explicativos
COMMENT ON COLUMN stories.link_url IS 'URL do link que será exibido no story (ex: WhatsApp, site externo)';
COMMENT ON COLUMN stories.link_text IS 'Texto do botão do link (ex: "Fale conosco", "Saiba mais")';

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name IN ('link_url', 'link_text');

-- Exemplo de uso:
-- UPDATE stories SET link_url = 'https://wa.me/5511999999999', link_text = 'Fale conosco' WHERE id = 'story-id';
