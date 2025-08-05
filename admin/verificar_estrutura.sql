-- Script para verificar a estrutura das tabelas
-- Execute no SQL Editor do Supabase

-- 1. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Verificar usuários existentes (com email da auth.users)
SELECT 
    p.id,
    au.email,
    p.full_name,
    p.is_admin,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- 3. Para tornar um usuário admin, execute:
-- UPDATE profiles SET is_admin = true WHERE id = 'ID_DO_USUARIO';

-- 4. Para verificar se a coluna is_admin existe:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'is_admin'; 