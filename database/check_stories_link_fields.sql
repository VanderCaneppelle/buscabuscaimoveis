-- =====================================================
-- VERIFICAR SE OS CAMPOS DE LINK EXISTEM NA TABELA STORIES
-- =====================================================

-- Verificar se os campos existem
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND column_name IN ('link_url', 'link_text');

-- Verificar estrutura completa da tabela stories
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stories'
ORDER BY ordinal_position;

-- Verificar se há stories com links
SELECT 
    id,
    title,
    link_url,
    link_text,
    created_at
FROM stories 
WHERE link_url IS NOT NULL
ORDER BY created_at DESC;
