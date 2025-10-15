-- =====================================================
-- TESTE SIMPLES DO TRIGGER - COM RESULTADOS VISÍVEIS
-- =====================================================

-- =====================================================
-- PASSO 1: VERIFICAR SE TRIGGERS EXISTEM
-- =====================================================

SELECT 
    '1. Verificar Triggers' as passo,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ Triggers instalados'
        WHEN COUNT(*) = 0 THEN '❌ Triggers NÃO instalados'
        ELSE '⚠️ Apenas ' || COUNT(*) || ' trigger encontrado'
    END as status
FROM pg_trigger
WHERE tgname IN ('trigger_cleanup_favorites_on_delete', 'trigger_cleanup_favorites_on_update');

-- =====================================================
-- PASSO 2: VERIFICAR FAVORITOS ÓRFÃOS
-- =====================================================

SELECT 
    '2. Favoritos Órfãos' as passo,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Nenhum órfão'
        ELSE '⚠️ ' || COUNT(*) || ' órfãos encontrados'
    END as status
FROM favorites f
LEFT JOIN properties p ON f.property_id = p.id
WHERE p.id IS NULL 
   OR p.ad_status = 'inactive' 
   OR p.status = 'rejected';

-- =====================================================
-- PASSO 3: TESTE REAL COM IMÓVEL EXISTENTE
-- =====================================================
-- Vamos usar um imóvel REAL e testar

-- Primeiro, veja se você tem algum imóvel ativo:
SELECT 
    '3a. Imóveis disponíveis para teste' as passo,
    COUNT(*) as quantidade
FROM properties 
WHERE ad_status = 'active' 
  AND status = 'approved';

-- Pegar 1 imóvel ativo para teste:
SELECT 
    '3b. Imóvel selecionado para teste' as info,
    id as property_id,
    title,
    ad_status,
    status
FROM properties 
WHERE ad_status = 'active' 
  AND status = 'approved'
LIMIT 1;

-- =====================================================
-- INSTRUÇÕES PARA TESTE MANUAL:
-- =====================================================
-- 
-- Com o property_id acima, execute ESTE SCRIPT:
-- 
-- -- 1. Criar um favorito de teste:
-- INSERT INTO favorites (user_id, property_id)
-- VALUES (
--     'COLE_SEU_USER_ID_AQUI',
--     'COLE_O_PROPERTY_ID_ACIMA'
-- );
-- 
-- -- 2. Verificar que foi criado:
-- SELECT * FROM favorites WHERE property_id = 'COLE_O_PROPERTY_ID';
-- -- Deve retornar 1 linha
-- 
-- -- 3. INATIVAR o imóvel (TRIGGER DEVE REMOVER FAVORITO):
-- UPDATE properties 
-- SET ad_status = 'inactive'
-- WHERE id = 'COLE_O_PROPERTY_ID';
-- 
-- -- 4. Verificar se favorito foi REMOVIDO:
-- SELECT * FROM favorites WHERE property_id = 'COLE_O_PROPERTY_ID';
-- -- Deve retornar 0 linhas (removido pelo trigger!)
-- 
-- -- 5. REATIVAR o imóvel:
-- UPDATE properties 
-- SET ad_status = 'active'
-- WHERE id = 'COLE_O_PROPERTY_ID';
-- 
-- =====================================================

-- =====================================================
-- TESTE AUTOMATIZADO ALTERNATIVO
-- =====================================================
-- Se você preferir um teste completamente automatizado,
-- execute o script abaixo EM BLOCOS SEPARADOS:
-- =====================================================

-- BLOCO 1: Criar imóvel de teste
-- Copie e execute APENAS este bloco:
/*
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
    (SELECT id FROM auth.users LIMIT 1),
    '[TESTE TRIGGER] Pode deletar',
    'Imóvel de teste para verificar trigger',
    100000,
    'apartment',
    'sale',
    'Rua Teste',
    'Bairro Teste',
    'Cidade Teste',
    'SP',
    'approved',
    'active'
)
RETURNING id as test_property_id, title;
*/

-- Cole o ID retornado acima nas queries abaixo, substituindo TEST_PROPERTY_ID

-- BLOCO 2: Criar favorito
-- Substitua TEST_PROPERTY_ID e execute:
/*
INSERT INTO favorites (user_id, property_id)
VALUES (
    (SELECT id FROM auth.users LIMIT 1),
    'TEST_PROPERTY_ID'
)
RETURNING id as test_favorite_id;
*/

-- BLOCO 3: Verificar favorito foi criado
-- Substitua TEST_PROPERTY_ID e execute:
/*
SELECT 
    'Favorito existe?' as check,
    COUNT(*) as quantidade,
    CASE WHEN COUNT(*) > 0 THEN '✅ Sim' ELSE '❌ Não' END as status
FROM favorites 
WHERE property_id = 'TEST_PROPERTY_ID';
*/

-- BLOCO 4: INATIVAR (TRIGGER DEVE AGIR)
-- Substitua TEST_PROPERTY_ID e execute:
/*
UPDATE properties 
SET ad_status = 'inactive'
WHERE id = 'TEST_PROPERTY_ID'
RETURNING id, ad_status;
*/

-- BLOCO 5: VERIFICAR SE FAVORITO FOI REMOVIDO
-- Substitua TEST_PROPERTY_ID e execute:
/*
SELECT 
    'Favorito foi removido?' as check,
    COUNT(*) as quantidade,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SIM - Trigger funcionou!'
        ELSE '❌ NÃO - Trigger não funcionou!'
    END as status
FROM favorites 
WHERE property_id = 'TEST_PROPERTY_ID';
*/

-- BLOCO 6: LIMPAR (deletar imóvel de teste)
-- Substitua TEST_PROPERTY_ID e execute:
/*
DELETE FROM properties WHERE id = 'TEST_PROPERTY_ID';
*/

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- BLOCO 3 (antes): quantidade = 1 (favorito existe)
-- BLOCO 5 (depois): quantidade = 0 (favorito removido)
-- 
-- Se BLOCO 5 retornar quantidade = 1, o trigger NÃO está funcionando!
-- =====================================================

