-- =====================================================
-- POPULAR USER_METADATA DE USUÁRIOS ANTIGOS
-- =====================================================
-- Este script copia os dados de public.profiles para auth.users.raw_user_meta_data
-- para usuários que foram cadastrados ANTES da correção da Edge Function

-- =====================================================
-- VERIFICAÇÕES INICIAIS
-- =====================================================

-- 1. Ver usuários SEM metadados (cadastrados antes da correção)
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    p.full_name,
    p.phone,
    p.is_realtor,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE (u.raw_user_meta_data = '{}'::jsonb 
       OR u.raw_user_meta_data->>'full_name' IS NULL)
ORDER BY u.created_at DESC;

-- 2. Ver usuários COM metadados (cadastrados após a correção)
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.created_at
FROM auth.users u
WHERE u.raw_user_meta_data->>'full_name' IS NOT NULL
ORDER BY u.created_at DESC;

-- =====================================================
-- ATUALIZAÇÃO (EXECUTAR COM CUIDADO!)
-- =====================================================

-- Atualizar apenas usuários que têm perfil mas não têm metadados
UPDATE auth.users u
SET raw_user_meta_data = jsonb_build_object(
    'full_name', COALESCE(p.full_name, ''),
    'phone', COALESCE(p.phone, ''),
    'is_realtor', COALESCE(p.is_realtor, false)
)
FROM public.profiles p
WHERE u.id = p.id
  AND (u.raw_user_meta_data = '{}'::jsonb 
       OR u.raw_user_meta_data->>'full_name' IS NULL)
  AND p.full_name IS NOT NULL; -- Só atualiza se tiver nome no profile

-- =====================================================
-- VERIFICAÇÕES PÓS-ATUALIZAÇÃO
-- =====================================================

-- 3. Contar usuários atualizados
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(CASE WHEN raw_user_meta_data->>'full_name' IS NOT NULL THEN 1 END) as com_metadata,
    COUNT(CASE WHEN raw_user_meta_data->>'full_name' IS NULL THEN 1 END) as sem_metadata
FROM auth.users;

-- 4. Ver todos os usuários com seus metadados
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'full_name' as display_name,
    u.raw_user_meta_data->>'phone' as phone_metadata,
    u.raw_user_meta_data->>'is_realtor' as is_realtor_metadata,
    p.full_name as profile_name,
    p.phone as profile_phone,
    p.is_realtor as profile_is_realtor,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- 5. Verificar discrepâncias (metadados diferentes do profile)
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'full_name' as metadata_name,
    p.full_name as profile_name,
    CASE 
        WHEN u.raw_user_meta_data->>'full_name' != p.full_name THEN '⚠️ DIFERENTE'
        ELSE '✅ OK'
    END as status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.raw_user_meta_data->>'full_name' IS NOT NULL
  AND p.full_name IS NOT NULL;

-- =====================================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================================

-- Para reverter a atualização (CUIDADO!)
-- UPDATE auth.users
-- SET raw_user_meta_data = '{}'::jsonb
-- WHERE id IN (
--     SELECT id FROM auth.users 
--     WHERE raw_user_meta_data->>'full_name' IS NOT NULL
-- );

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

/*
1. Este script deve ser executado APÓS atualizar a Edge Function

2. Usuários novos (cadastrados após a correção) JÁ terão metadados
   e NÃO serão afetados por este script

3. O script é idempotente: pode ser executado múltiplas vezes sem problemas
   (só atualiza quem não tem metadados)

4. Se um usuário não tem profile (improvável), ele não será atualizado

5. COALESCE garante que campos vazios/null sejam tratados corretamente

6. Após executar, verifique no Dashboard:
   Authentication → Users → Clique em um usuário → User Metadata
*/

