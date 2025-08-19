-- =====================================================
-- POLÍTICAS RLS PARA TABELA STORIES
-- =====================================================

-- Habilitar RLS na tabela stories
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Política para visualização pública (todos podem ver stories ativos)
CREATE POLICY "Public can view active stories" ON stories
    FOR SELECT USING (status = 'active');

-- Política para inserção (apenas usuários autenticados podem criar)
CREATE POLICY "Authenticated users can create stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para atualização (apenas o criador pode atualizar)
CREATE POLICY "Users can update their own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para exclusão (apenas o criador pode excluir)
CREATE POLICY "Users can delete their own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'stories'
ORDER BY policyname;
