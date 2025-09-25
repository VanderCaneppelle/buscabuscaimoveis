-- RECRIAR FUNÇÕES: Versão correta e segura das funções
-- Execute este script para recriar as funções com permissões adequadas

-- 1. Recriar a função get_user_email (versão segura)
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
    
    -- Buscar email na tabela auth.users com tratamento de erro
    BEGIN
        SELECT email INTO user_email 
        FROM auth.users 
        WHERE id = user_id;
        
        RETURN user_email;
    EXCEPTION
        WHEN OTHERS THEN
            -- Em caso de erro, retornar NULL em vez de falhar
            RETURN NULL;
    END;
END;
$$;

-- 2. Recriar a função handle_new_user (versão segura)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Inserir perfil com tratamento de erro
    BEGIN
        INSERT INTO public.profiles (id, full_name, avatar_url)
        VALUES (
            new.id, 
            COALESCE(new.raw_user_meta_data->>'full_name', ''),
            COALESCE(new.raw_user_meta_data->>'avatar_url', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(new.raw_user_meta_data->>'full_name', profiles.full_name),
            avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', profiles.avatar_url);
    EXCEPTION
        WHEN OTHERS THEN
            -- Em caso de erro, apenas logar e continuar
            RAISE WARNING 'Erro ao criar perfil para usuário %: %', new.id, SQLERRM;
    END;
    
    RETURN new;
END;
$$;

-- 3. Recriar o trigger (versão segura)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Garantir permissões corretas
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 5. Verificar se as funções foram criadas corretamente
SELECT 
    routine_name, 
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('get_user_email', 'handle_new_user')
ORDER BY routine_name;

-- 6. Testar a função get_user_email
SELECT public.get_user_email('00000000-0000-0000-0000-000000000000'::uuid) as test_result;
