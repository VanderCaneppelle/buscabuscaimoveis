-- Tornar usuário admin
-- Execute no SQL Editor do Supabase

UPDATE profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = 'vandercaneppelle@outlook.com');

-- Verificar se funcionou
SELECT 
    p.id,
    au.email,
    p.full_name,
    p.is_admin,
    p.created_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'vandercaneppelle@outlook.com'; 