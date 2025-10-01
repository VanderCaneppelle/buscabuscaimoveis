-- =====================================================
-- DEBUG: Problemas de Login
-- =====================================================

-- 1. Ver usuários recentes e status de confirmação
SELECT 
    email,
    email_confirmed_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '❌ NÃO CONFIRMADO'
        ELSE '✅ CONFIRMADO'
    END as status_confirmacao,
    raw_user_meta_data->>'full_name' as nome,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar se há perfil criado para cada usuário
SELECT 
    u.email,
    u.email_confirmed_at,
    p.full_name,
    CASE 
        WHEN p.id IS NULL THEN '❌ SEM PERFIL'
        ELSE '✅ COM PERFIL'
    END as tem_perfil
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Verificar usuários com problemas
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.banned_until,
    u.deleted_at,
    CASE 
        WHEN u.email_confirmed_at IS NULL THEN 'Email não confirmado'
        WHEN u.banned_until IS NOT NULL THEN 'Usuário banido'
        WHEN u.deleted_at IS NOT NULL THEN 'Usuário deletado'
        ELSE 'OK'
    END as status
FROM auth.users u
WHERE u.email_confirmed_at IS NULL
   OR u.banned_until IS NOT NULL
   OR u.deleted_at IS NOT NULL
ORDER BY u.created_at DESC;

-- 4. Tentar encontrar usuário específico (substitua o email)
-- SELECT * FROM auth.users WHERE email = 'SEU_EMAIL@AQUI.COM';

