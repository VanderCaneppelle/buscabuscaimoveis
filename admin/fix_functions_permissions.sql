-- CORRIGIR: Funções que podem estar causando o erro de permissão
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se a função get_user_email existe e suas permissões
SELECT 
    routine_name, 
    routine_type,
    security_type,
    definer_rights
FROM information_schema.routines 
WHERE routine_name = 'get_user_email' 
AND routine_schema = 'public';

-- 2. Recriar a função get_user_email com permissões corretas
DROP FUNCTION IF EXISTS public.get_user_email(uuid);

CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_email text;
BEGIN
    -- Verificar se o user_id é válido
    IF user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Buscar email na tabela auth.users
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = user_id;
    
    RETURN user_email;
END;
$$;

-- 3. Garantir permissões para a função
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO service_role;

-- 4. Verificar se há outras funções problemáticas
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%' OR routine_name LIKE '%profile%'
ORDER BY routine_name;

-- 5. Verificar se a função handle_new_user está correta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Inserir ou atualizar perfil
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = COALESCE(new.raw_user_meta_data->>'full_name', profiles.full_name),
        avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', profiles.avatar_url);
    
    RETURN new;
END;
$$;

-- 6. Garantir permissões para handle_new_user
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 7. Verificar se o trigger está correto
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Testar a função get_user_email
SELECT public.get_user_email('00000000-0000-0000-0000-000000000000'::uuid) as test_result;

-- 9. Verificar se há funções com SECURITY INVOKER que podem estar causando problema
SELECT 
    routine_name,
    security_type,
    definer_rights
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND security_type = 'INVOKER'
ORDER BY routine_name;
