-- =====================================================
-- CORREÇÃO DAS POLÍTICAS RLS PARA ACTIVE_SESSIONS
-- =====================================================

-- Remover políticas RLS problemáticas
DROP POLICY IF EXISTS "Only functions can insert sessions" ON active_sessions;
DROP POLICY IF EXISTS "Only functions can delete sessions" ON active_sessions;

-- Criar novas políticas que permitem inserção/atualização
CREATE POLICY "Users can insert own sessions" ON active_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON active_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Verificar se as políticas foram criadas corretamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'active_sessions'; 