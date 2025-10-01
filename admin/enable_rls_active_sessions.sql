-- =====================================================
-- HABILITAR RLS PARA ACTIVE_SESSIONS
-- =====================================================

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON active_sessions;

-- Habilitar RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Ver apenas próprias sessões
CREATE POLICY "Users can view own sessions" ON active_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Criar apenas próprias sessões
CREATE POLICY "Users can create own sessions" ON active_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Atualizar apenas próprias sessões
CREATE POLICY "Users can update own sessions" ON active_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Deletar apenas próprias sessões
CREATE POLICY "Users can delete own sessions" ON active_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Verificar se foi aplicado corretamente
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions';

SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'active_sessions';

