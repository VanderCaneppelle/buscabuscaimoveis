-- Script para tornar um usuário admin
-- Execute no SQL Editor do Supabase

-- 1. Verificar usuários existentes
SELECT 
    p.id,
    au.email,
    p.full_name,
    p.is_admin,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- 2. Para tornar um usuário admin, execute (substitua pelo email do usuário):
-- UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'SEU_EMAIL@exemplo.com');

-- 3. Para verificar se funcionou:
-- SELECT 
--     p.id,
--     au.email,
--     p.full_name,
--     p.is_admin
-- FROM profiles p
-- LEFT JOIN auth.users au ON p.id = au.id
-- WHERE au.email = 'SEU_EMAIL@exemplo.com'; 