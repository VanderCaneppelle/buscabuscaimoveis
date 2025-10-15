-- =====================================================
-- DIAGNÓSTICO DO TRIGGER DE FAVORITOS
-- =====================================================
-- Execute este script para verificar se o trigger está instalado e funcionando
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SE TRIGGERS EXISTEM
-- =====================================================

SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ Ativo'
        WHEN tgenabled = 'D' THEN '❌ Desabilitado'
        ELSE '⚠️ Estado desconhecido'
    END as status
FROM pg_trigger
WHERE tgname IN ('trigger_cleanup_favorites_on_delete', 'trigger_cleanup_favorites_on_update')
ORDER BY tgname;

-- Deve retornar 2 linhas:
-- trigger_cleanup_favorites_on_delete | ✅ Ativo
-- trigger_cleanup_favorites_on_update | ✅ Ativo

-- =====================================================
-- 2. VERIFICAR SE FUNÇÃO EXISTE
-- =====================================================

SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'cleanup_favorites_on_property_change';

-- Deve retornar 1 linha com a função

-- =====================================================
-- 3. LISTAR FAVORITOS ATUAIS
-- =====================================================

SELECT 
    f.id,
    f.user_id,
    f.property_id,
    p.title,
    p.ad_status,
    p.status,
    CASE 
        WHEN p.ad_status = 'inactive' THEN '⚠️ ÓRFÃO (inativo)'
        WHEN p.status = 'rejected' THEN '⚠️ ÓRFÃO (rejeitado)'
        WHEN p.id IS NULL THEN '⚠️ ÓRFÃO (deletado)'
        ELSE '✅ OK'
    END as state
FROM favorites f
LEFT JOIN properties p ON f.property_id = p.id
ORDER BY state DESC, f.created_at DESC
LIMIT 20;

-- Se houver ⚠️ ÓRFÃO, o trigger não está funcionando

-- =====================================================
-- 4. TESTE MANUAL DO TRIGGER
-- =====================================================

-- Primeiro, criar um imóvel de teste
DO $$
DECLARE
    test_property_id UUID;
    test_user_id UUID;
BEGIN
    -- Pegar primeiro usuário da tabela
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado para teste';
    END IF;
    
    -- Criar imóvel de teste
    INSERT INTO properties (
        user_id,
        title,
        description,
        price,
        property_type,
        transaction_type,
        address,
        neighborhood,
        city,
        state,
        status,
        ad_status
    ) VALUES (
        test_user_id,
        '[TESTE] Imóvel para testar trigger',
        'Este é um imóvel de teste. Pode ser deletado.',
        100000,
        'apartment',
        'sale',
        'Rua Teste, 123',
        'Bairro Teste',
        'Cidade Teste',
        'SP',
        'approved',
        'active'
    ) RETURNING id INTO test_property_id;
    
    RAISE NOTICE '✅ Imóvel de teste criado: %', test_property_id;
    
    -- Criar favorito de teste
    INSERT INTO favorites (user_id, property_id)
    VALUES (test_user_id, test_property_id);
    
    RAISE NOTICE '✅ Favorito de teste criado para user: %', test_user_id;
    
    -- Verificar favorito foi criado
    IF EXISTS (SELECT 1 FROM favorites WHERE property_id = test_property_id) THEN
        RAISE NOTICE '✅ Favorito existe no banco';
    ELSE
        RAISE EXCEPTION '❌ Favorito não foi criado!';
    END IF;
    
    -- ===== TESTE 1: INATIVAR =====
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTE 1: Inativando imóvel...';
    
    UPDATE properties 
    SET ad_status = 'inactive'
    WHERE id = test_property_id;
    
    -- Aguardar 1 segundo (trigger é AFTER)
    PERFORM pg_sleep(1);
    
    -- Verificar se favorito foi removido
    IF NOT EXISTS (SELECT 1 FROM favorites WHERE property_id = test_property_id) THEN
        RAISE NOTICE '✅ TESTE 1 PASSOU: Favorito foi removido automaticamente!';
    ELSE
        RAISE WARNING '❌ TESTE 1 FALHOU: Favorito ainda existe após inativar!';
    END IF;
    
    -- Reativar para próximo teste
    UPDATE properties 
    SET ad_status = 'active'
    WHERE id = test_property_id;
    
    -- Recriar favorito
    INSERT INTO favorites (user_id, property_id)
    VALUES (test_user_id, test_property_id);
    
    -- ===== TESTE 2: REJEITAR =====
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTE 2: Rejeitando imóvel...';
    
    UPDATE properties 
    SET status = 'rejected'
    WHERE id = test_property_id;
    
    PERFORM pg_sleep(1);
    
    IF NOT EXISTS (SELECT 1 FROM favorites WHERE property_id = test_property_id) THEN
        RAISE NOTICE '✅ TESTE 2 PASSOU: Favorito foi removido após rejeitar!';
    ELSE
        RAISE WARNING '❌ TESTE 2 FALHOU: Favorito ainda existe após rejeitar!';
    END IF;
    
    -- Reaprovar e reativar
    UPDATE properties 
    SET status = 'approved', ad_status = 'active'
    WHERE id = test_property_id;
    
    -- Recriar favorito
    INSERT INTO favorites (user_id, property_id)
    VALUES (test_user_id, test_property_id);
    
    -- ===== TESTE 3: DELETAR =====
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTE 3: Deletando imóvel...';
    
    DELETE FROM properties WHERE id = test_property_id;
    
    PERFORM pg_sleep(1);
    
    IF NOT EXISTS (SELECT 1 FROM favorites WHERE property_id = test_property_id) THEN
        RAISE NOTICE '✅ TESTE 3 PASSOU: Favorito foi removido após deletar!';
    ELSE
        RAISE WARNING '❌ TESTE 3 FALHOU: Favorito ainda existe após deletar!';
        -- Limpar manualmente
        DELETE FROM favorites WHERE property_id = test_property_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TESTES CONCLUÍDOS';
    RAISE NOTICE '========================================';
    
END $$;

-- =====================================================
-- 5. VERIFICAR REALTIME
-- =====================================================

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename = ANY(
            SELECT tablename 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime'
        ) THEN '✅ Realtime habilitado'
        ELSE '❌ Realtime NÃO habilitado'
    END as realtime_status
FROM pg_tables
WHERE tablename = 'favorites'
  AND schemaname = 'public';

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- 1. Execute este script completo
-- 2. Veja as mensagens NOTICE no output
-- 3. Se algum teste FALHOU, o trigger não está funcionando
-- 4. Se todos PASSARAM, o trigger está OK
-- 5. Cole aqui o output completo
-- =====================================================

