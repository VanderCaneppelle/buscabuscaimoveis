-- =====================================================
-- HABILITAR RLS PARA PROFILES
-- =====================================================

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Permitir INSERT do próprio perfil (uma vez)
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id 
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    );

-- 2. Todos autenticados podem ver todos os perfis
CREATE POLICY "Authenticated users can view all profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 3. Atualizar apenas próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Verificar se foi aplicado corretamente
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

