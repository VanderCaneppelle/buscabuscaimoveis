-- =====================================================
-- TOGGLE RLS - PROPERTIES
-- =====================================================
-- Use para testar se RLS está bloqueando Realtime
-- =====================================================

-- =====================================================
-- OPÇÃO 1: DESABILITAR RLS (TESTE)
-- =====================================================

-- Desabilitar RLS na tabela properties
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '❌ RLS Desabilitado'
        ELSE '✅ RLS Habilitado'
    END as status
FROM pg_tables 
WHERE tablename = 'properties';

-- =====================================================
-- TESTE APÓS DESABILITAR
-- =====================================================
-- 
-- 1. Admin rejeita um imóvel
-- 2. Veja se AMBOS os usuários recebem o evento Realtime
-- 3. Veja se AMBOS veem o imóvel sumir da lista
-- 
-- Se FUNCIONAR: Problema é RLS bloqueando eventos
-- Se NÃO FUNCIONAR: Problema é outro (lógica do Realtime)
-- 
-- =====================================================

-- =====================================================
-- OPÇÃO 2: REABILITAR RLS (APÓS TESTE)
-- =====================================================

-- Reabilitar RLS na tabela properties
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Verificar
-- SELECT 
--     tablename,
--     rowsecurity as rls_enabled,
--     CASE 
--         WHEN rowsecurity = true THEN '✅ RLS Habilitado'
--         ELSE '❌ RLS Desabilitado'
--     END as status
-- FROM pg_tables 
-- WHERE tablename = 'properties';

-- =====================================================
-- OPÇÃO 3: VER POLÍTICAS RLS ATUAIS
-- =====================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd as operacao,
    qual as condicao
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY cmd, policyname;

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- 
-- PASSO 1: Execute a OPÇÃO 1 (desabilitar RLS)
-- 
-- PASSO 2: Teste rejeitar imóvel em 2 usuários
-- 
-- PASSO 3: Se funcionar, o problema É RLS
--          - Precisamos ajustar as políticas
--          - Ou fazer Realtime usar service_role
-- 
-- PASSO 4: Execute a OPÇÃO 2 (reabilitar RLS)
--          - IMPORTANTE: Não deixe RLS desabilitado em produção!
-- 
-- =====================================================

