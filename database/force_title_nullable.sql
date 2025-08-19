-- =====================================================
-- FORÇAR CAMPO TITLE A PERMITIR NULL
-- =====================================================

-- Verificar estrutura atual
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'title';

-- Forçar alteração para permitir NULL
ALTER TABLE stories 
ALTER COLUMN title TYPE VARCHAR(255),
ALTER COLUMN title DROP NOT NULL;

-- Verificar se a alteração foi aplicada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'title';

-- Testar inserção com título NULL
INSERT INTO stories (
    title,
    image_url,
    media_type,
    status,
    order_index,
    created_at
) VALUES (
    NULL,
    'https://test.com/test.jpg',
    'video',
    'active',
    (SELECT COALESCE(MAX(order_index), 0) + 1 FROM stories),
    NOW()
);

-- Verificar se foi inserido
SELECT 
    id,
    title,
    CASE 
        WHEN title IS NULL THEN 'NULL'
        WHEN title = '' THEN 'VAZIO'
        ELSE 'COM_TEXTO'
    END as status_titulo,
    created_at
FROM stories
ORDER BY created_at DESC
LIMIT 5;

-- Limpar teste
DELETE FROM stories WHERE image_url = 'https://test.com/test.jpg';
