-- =====================================================
-- VERIFICAR SE O CAMPO TITLE PERMITE VALORES NULOS
-- =====================================================

-- Verificar se o campo title permite NULL
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'title';

-- Se não permitir NULL, alterar para permitir
ALTER TABLE stories 
ALTER COLUMN title DROP NOT NULL;

-- Verificar novamente
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'title';

-- Mostrar stories existentes com títulos vazios ou nulos
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
LIMIT 10;
