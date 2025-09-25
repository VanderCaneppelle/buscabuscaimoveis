-- FIX TEMPORÁRIO: Remover funções que podem estar causando o erro
-- Execute este script para testar se o problema é com as funções

-- 1. Remover temporariamente a função get_user_email
DROP FUNCTION IF EXISTS public.get_user_email(uuid);

-- 2. Remover temporariamente a função handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Remover o trigger que usa handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 4. Verificar se há outras funções que podem estar causando problema
-- (Listar todas as funções para identificar possíveis culpadas)
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. Testar se o login funciona agora
-- (Você pode testar fazendo login no admin panel)

-- 6. Se o login funcionar, recriar as funções uma por uma para identificar qual está causando o problema

-- RECRIAR get_user_email (versão simples)
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email text;
BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = user_id;
    RETURN user_email;
END;
$$;

-- RECRIAR handle_new_user (versão simples)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- RECRIAR o trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
