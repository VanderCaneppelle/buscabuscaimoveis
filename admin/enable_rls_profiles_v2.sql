-- =====================================================
-- HABILITAR RLS PARA PROFILES (Backend cria via Edge Function)
-- =====================================================

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS:
-- =====================================================

-- 1. SELECT: Todos autenticados podem ver todos os perfis
--    (Necessário para ver dados de anunciantes nos cards)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. UPDATE: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. INSERT: Apenas service_role pode inserir (Edge Function)
--    Frontend não precisa mais inserir!
CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- 4. DELETE: Apenas service_role pode deletar (admin)
-- (sem política = apenas service_role pode)

-- =====================================================
-- VERIFICAÇÕES:
-- =====================================================

-- Verificar se RLS foi habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Listar todas as políticas criadas
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Contar perfis existentes
SELECT COUNT(*) as total_profiles FROM profiles;

