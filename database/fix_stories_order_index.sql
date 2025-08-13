-- Corrigir order_index dos stories existentes
-- Execute no SQL Editor do Supabase

-- 1. Verificar stories existentes
SELECT 
    id,
    title,
    media_type,
    order_index,
    created_at,
    status
FROM stories
ORDER BY created_at ASC;

-- 2. Atualizar order_index baseado na data de criação
WITH numbered_stories AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order_index
    FROM stories
    WHERE status = 'active'
)
UPDATE stories 
SET order_index = numbered_stories.new_order_index
FROM numbered_stories
WHERE stories.id = numbered_stories.id;

-- 3. Verificar resultado
SELECT 
    id,
    title,
    media_type,
    order_index,
    created_at,
    status
FROM stories
ORDER BY order_index ASC; 