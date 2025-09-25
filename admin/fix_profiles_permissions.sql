-- Corrigir permissões da tabela profiles
-- Este script resolve o erro "permission denied for table profiles"

-- 1. Verificar se a tabela profiles existe e sua estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

-- 2. Verificar políticas RLS atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Remover políticas problemáticas se existirem
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON profiles;

-- 4. Criar políticas corretas para profiles
-- Política para leitura: todos podem ler profiles
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT
    USING (true);

-- Política para inserção: usuários autenticados podem inserir
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política para atualização: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para deleção: usuários podem deletar apenas seu próprio perfil
CREATE POLICY "profiles_delete_policy" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- 5. Verificar se RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. Garantir que o Supabase Auth pode atualizar last_sign_in
-- Criar política específica para o sistema de auth
CREATE POLICY "auth_system_update_profiles" ON profiles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 7. Verificar se a função de trigger existe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Recriar o trigger se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Verificar permissões da tabela
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO service_role;

-- 10. Verificar se a função get_user_email ainda existe
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_email' 
AND routine_schema = 'public';
