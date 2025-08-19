-- =====================================================
-- ADICIONAR CAMPO USER_ID À TABELA STORIES
-- =====================================================

-- Verificar se o campo user_id já existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'user_id';

-- Adicionar campo user_id se não existir
ALTER TABLE stories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Adicionar comentário
COMMENT ON COLUMN stories.user_id IS 'ID do usuário que criou o story';

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

-- Verificar se foi adicionado
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
AND column_name = 'user_id';

-- Verificar estrutura completa da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'stories'
ORDER BY ordinal_position;
