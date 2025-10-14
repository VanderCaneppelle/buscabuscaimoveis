-- =====================================================
-- HABILITAR REALTIME PARA FAVORITOS + AUTO-REMOÇÃO
-- =====================================================
-- Este script:
-- 1. Habilita Realtime para sincronização entre dispositivos
-- 2. Cria trigger para remover favoritos de imóveis inativos/excluídos
-- =====================================================

-- =====================================================
-- PARTE 1: HABILITAR REALTIME
-- =====================================================

-- Habilitar Realtime para a tabela favorites
ALTER publication supabase_realtime ADD TABLE favorites;

COMMENT ON TABLE favorites IS 'Favoritos dos usuários - com Realtime habilitado para sincronização instantânea';

-- =====================================================
-- PARTE 2: AUTO-REMOÇÃO DE FAVORITOS
-- =====================================================
-- Quando um imóvel é inativado ou excluído, remover todos os favoritos dele

-- Criar função para limpar favoritos de imóveis inativos/excluídos
CREATE OR REPLACE FUNCTION cleanup_favorites_on_property_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o imóvel foi deletado
    IF (TG_OP = 'DELETE') THEN
        -- Remover todos os favoritos deste imóvel
        DELETE FROM favorites WHERE property_id = OLD.id;
        
        RAISE NOTICE 'Favoritos removidos para property_id: % (DELETE)', OLD.id;
        RETURN OLD;
    END IF;

    -- Se o imóvel foi atualizado
    IF (TG_OP = 'UPDATE') THEN
        -- Se mudou para status inativo ou rejeitado
        IF (NEW.ad_status = 'inactive' OR NEW.status = 'rejected') AND 
           (OLD.ad_status != 'inactive' OR OLD.status != 'rejected') THEN
            
            -- Remover todos os favoritos deste imóvel
            DELETE FROM favorites WHERE property_id = NEW.id;
            
            RAISE NOTICE 'Favoritos removidos para property_id: % (status: %, ad_status: %)', 
                NEW.id, NEW.status, NEW.ad_status;
        END IF;
        
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_favorites_on_property_change IS 'Remove favoritos automaticamente quando imóvel é inativado, rejeitado ou excluído';

-- =====================================================
-- CRIAR TRIGGER
-- =====================================================

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_delete ON properties;
DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_update ON properties;

-- Trigger para DELETE (quando imóvel é excluído)
CREATE TRIGGER trigger_cleanup_favorites_on_delete
    AFTER DELETE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_favorites_on_property_change();

-- Trigger para UPDATE (quando imóvel é inativado/rejeitado)
CREATE TRIGGER trigger_cleanup_favorites_on_update
    AFTER UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_favorites_on_property_change();

-- =====================================================
-- PARTE 3: VERIFICAÇÕES E VALIDAÇÕES
-- =====================================================

-- Verificar se Realtime foi habilitado
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'favorites'
    ) THEN
        RAISE NOTICE '✅ Realtime habilitado com sucesso para tabela favorites!';
    ELSE
        RAISE WARNING '⚠️ Realtime NÃO foi habilitado para favorites. Verifique o comando.';
    END IF;
END $$;

-- Verificar se triggers foram criados
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname IN ('trigger_cleanup_favorites_on_delete', 'trigger_cleanup_favorites_on_update');
    
    IF trigger_count = 2 THEN
        RAISE NOTICE '✅ Triggers de auto-remoção criados com sucesso!';
    ELSE
        RAISE WARNING '⚠️ Triggers não foram criados corretamente (encontrados: %)', trigger_count;
    END IF;
END $$;

-- =====================================================
-- TESTAR A FUNCIONALIDADE (OPCIONAL)
-- =====================================================

-- Para testar a auto-remoção, execute:
-- 1. Crie um favorito manualmente
-- 2. Inative o imóvel
-- 3. Verifique se o favorito foi removido automaticamente

/*
-- Exemplo de teste:
-- 1. Inserir favorito (substitua os UUIDs)
INSERT INTO favorites (user_id, property_id) 
VALUES ('seu-user-id', 'seu-property-id');

-- 2. Inativar imóvel
UPDATE properties 
SET ad_status = 'inactive' 
WHERE id = 'seu-property-id';

-- 3. Verificar se favorito foi removido
SELECT * FROM favorites WHERE property_id = 'seu-property-id';
-- Deve retornar 0 linhas
*/

-- =====================================================
-- DESABILITAR (se necessário no futuro)
-- =====================================================

-- Para desabilitar Realtime:
-- ALTER publication supabase_realtime DROP TABLE favorites;

-- Para remover triggers:
-- DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_delete ON properties;
-- DROP TRIGGER IF EXISTS trigger_cleanup_favorites_on_update ON properties;
-- DROP FUNCTION IF EXISTS cleanup_favorites_on_property_change;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique as mensagens de sucesso:
--    ✅ Realtime habilitado
--    ✅ Triggers criados
-- 3. Pronto! Sistema de favoritos com Realtime está ativo
--
-- RECURSOS IMPLEMENTADOS:
-- ✅ Sincronização instantânea entre dispositivos
-- ✅ Auto-remoção quando imóvel é inativado/excluído
-- ✅ Notificações via Realtime (INSERT/DELETE)
-- ✅ Segurança via RLS mantida
-- =====================================================

