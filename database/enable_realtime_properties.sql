-- =====================================================
-- HABILITAR REALTIME PARA IMÓVEIS (PROPERTIES)
-- =====================================================
-- Este script habilita Realtime para atualização automática
-- da lista de imóveis na HomeScreen
-- =====================================================

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

-- Habilitar Realtime para a tabela properties
ALTER publication supabase_realtime ADD TABLE properties;

COMMENT ON TABLE properties IS 'Imóveis/Propriedades - com Realtime habilitado para atualizações instantâneas';

-- =====================================================
-- IMPORTANTE: FILTROS NO CLIENT-SIDE
-- =====================================================
-- O Realtime enviará TODOS os eventos de properties
-- Mas o client-side filtra apenas:
-- - status = 'approved' (INSERT)
-- - ad_status mudando para 'inactive' (UPDATE)
-- - Exclusões (DELETE)
--
-- Isso garante que apenas imóveis relevantes atualizem a UI
-- =====================================================

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se Realtime foi habilitado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'properties'
    ) THEN
        RAISE NOTICE '✅ Realtime habilitado com sucesso para tabela properties!';
    ELSE
        RAISE WARNING '⚠️ Realtime NÃO foi habilitado. Verifique o comando.';
    END IF;
END $$;

-- Verificar quais tabelas têm Realtime habilitado
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- =====================================================
-- DESABILITAR (se necessário no futuro)
-- =====================================================
-- Para desabilitar:
-- ALTER publication supabase_realtime DROP TABLE properties;
-- =====================================================

-- =====================================================
-- COMPORTAMENTOS IMPLEMENTADOS
-- =====================================================
--
-- 1. NOVO IMÓVEL APROVADO:
--    - Admin aprova imóvel (status = 'approved', ad_status = 'active')
--    - Realtime detecta INSERT ou UPDATE
--    - Imóvel aparece no topo da HomeScreen instantaneamente
--
-- 2. IMÓVEL INATIVADO:
--    - Dono ou Admin inativa imóvel (ad_status = 'inactive')
--    - Realtime detecta UPDATE
--    - Imóvel some da HomeScreen instantaneamente
--
-- 3. IMÓVEL REJEITADO:
--    - Admin rejeita imóvel (status = 'rejected')
--    - Realtime detecta UPDATE
--    - Imóvel some da HomeScreen instantaneamente
--
-- 4. IMÓVEL EXCLUÍDO:
--    - Admin exclui imóvel (DELETE)
--    - Realtime detecta DELETE
--    - Imóvel some da HomeScreen instantaneamente
--
-- =====================================================

-- =====================================================
-- PERFORMANCE E CUSTOS
-- =====================================================
--
-- ESTIMATIVA:
-- - ~100 eventos/dia (inserções + updates + deletes)
-- - = ~3.000 eventos/mês
-- - = 0,06% da cota do plano Pro
--
-- CONCLUSÃO: Totalmente viável! ✅
--
-- =====================================================

-- =====================================================
-- INSTRUCÕES DE USO
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique a mensagem: ✅ "Realtime habilitado com sucesso"
-- 3. Código já está integrado (stores/propertiesStore.js + HomeScreen.js)
-- 4. Pronto! Lista atualiza automaticamente
--
-- TESTAR:
-- 1. Abra HomeScreen
-- 2. Admin aprova um imóvel
-- 3. Veja aparecer instantaneamente (1-2s)
--
-- 4. Admin inativa/exclui um imóvel
-- 5. Veja sumir instantaneamente (1-2s)
-- =====================================================

