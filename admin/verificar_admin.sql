-- Script para verificar e configurar usuários admin
-- Execute no SQL Editor do Supabase

-- 1. Verificar usuários existentes
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.is_admin,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- 2. Para tornar um usuário admin, execute:
-- UPDATE profiles SET is_admin = true WHERE email = 'SEU_EMAIL@exemplo.com';

-- 3. Para verificar se a coluna is_admin existe:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'is_admin'; 