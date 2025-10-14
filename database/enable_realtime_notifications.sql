-- =====================================================
-- HABILITAR REALTIME PARA NOTIFICAÇÕES IN-APP
-- =====================================================
-- Este script habilita o Supabase Realtime para a tabela
-- in_app_notifications, permitindo atualizações instantâneas
-- =====================================================

-- Habilitar Realtime para a tabela in_app_notifications
ALTER publication supabase_realtime ADD TABLE in_app_notifications;

-- Verificar se foi habilitado
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique se a tabela 'in_app_notifications' aparece na lista
-- 3. Pronto! Realtime está habilitado
--
-- IMPORTANTE:
-- - Certifique-se de ter o plano Pro ou superior do Supabase
-- - Realtime funciona apenas com RLS habilitado (já está configurado)
-- - As mudanças serão transmitidas apenas para o usuário dono da notificação
-- =====================================================

-- =====================================================
-- DESABILITAR (se necessário)
-- =====================================================
-- Para desabilitar o Realtime futuramente:
-- ALTER publication supabase_realtime DROP TABLE in_app_notifications;
-- =====================================================

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'in_app_notifications'
    ) THEN
        RAISE NOTICE '✅ Realtime habilitado com sucesso para in_app_notifications!';
    ELSE
        RAISE WARNING '⚠️ Realtime NÃO foi habilitado. Verifique se você executou o comando corretamente.';
    END IF;
END $$;

