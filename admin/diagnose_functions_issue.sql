-- DIAGNÓSTICO: Verificar funções que podem estar causando o erro
-- Execute este script para identificar o problema específico

-- 1. Verificar todas as funções relacionadas a users/profiles
SELECT 
    routine_name, 
    routine_type,
    security_type,
    definer_rights,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%user%' 
    OR routine_name LIKE '%profile%'
    OR routine_name LIKE '%auth%'
    OR routine_definition LIKE '%profiles%'
    OR routine_definition LIKE '%auth.users%'
)
ORDER BY routine_name;

-- 2. Verificar permissões das funções
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public'
AND routine_name IN (
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    AND (routine_name LIKE '%user%' OR routine_name LIKE '%profile%')
)
ORDER BY routine_name, grantee;

-- 3. Verificar se há funções com SECURITY INVOKER
SELECT 
    routine_name,
    security_type,
    definer_rights,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND security_type = 'INVOKER'
AND (
    routine_definition LIKE '%profiles%'
    OR routine_definition LIKE '%auth.users%'
);

-- 4. Verificar triggers que podem estar executando funções problemáticas
SELECT 
    trigger_name,
    event_object_table,
    event_object_schema,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth'
ORDER BY trigger_name;

-- 5. Verificar se há funções sendo chamadas durante o login
-- (Isso pode ajudar a identificar qual função está falhando)
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_definition LIKE '%last_sign_in%'
OR routine_definition LIKE '%profiles%'
ORDER BY routine_name;

-- 6. Verificar se a função get_user_email está sendo chamada corretamente
SELECT 
    routine_name,
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters 
WHERE specific_schema = 'public'
AND specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'get_user_email'
)
ORDER BY ordinal_position;
