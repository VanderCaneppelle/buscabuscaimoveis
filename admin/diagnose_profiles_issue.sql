-- DIAGNÓSTICO: Verificar status da tabela profiles e políticas RLS
-- Execute este script para entender o problema atual

-- 1. Verificar se a tabela profiles existe
SELECT 
    table_name, 
    table_schema,
    row_security
FROM information_schema.tables 
WHERE table_name = 'profiles' 
AND table_schema = 'public';

-- 2. Verificar estrutura da tabela profiles
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS atuais
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 5. Verificar se as funções existem
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('handle_new_user', 'get_user_email')
AND routine_schema = 'public';

-- 6. Verificar triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users'
AND event_object_schema = 'auth';

-- 7. Verificar se há dados na tabela profiles
SELECT COUNT(*) as total_profiles FROM profiles;

-- 8. Verificar se há usuários sem perfil
SELECT 
    au.id,
    au.email,
    au.created_at,
    p.id as profile_id
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
LIMIT 10;
