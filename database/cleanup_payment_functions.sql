-- =====================================================
-- LIMPEZA DE TODAS AS FUNÇÕES DE PAGAMENTO
-- =====================================================

-- Remover triggers
DROP TRIGGER IF EXISTS trigger_handle_payment_approved ON payments;
DROP TRIGGER IF EXISTS trigger_log_payment_changes ON payments;

-- Remover funções
DROP FUNCTION IF EXISTS handle_payment_approved();
DROP FUNCTION IF EXISTS update_payment_status(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_webhook_received(JSONB);
DROP FUNCTION IF EXISTS process_mercado_pago_webhook(JSONB, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_payment_from_webhook(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS check_payment_status(UUID);
DROP FUNCTION IF EXISTS get_user_payment_history(UUID);
DROP FUNCTION IF EXISTS test_update_payment_manual(UUID, TEXT, TEXT);

-- Remover views
DROP VIEW IF EXISTS payment_reports;

-- Remover tabela de logs (se existir)
DROP TABLE IF EXISTS payment_logs;

-- Limpar dados de pagamentos (opcional - descomente se quiser)
-- DELETE FROM payments WHERE status = 'pending';
-- DELETE FROM user_subscriptions WHERE payment_id IS NOT NULL;

-- Verificar o que sobrou
SELECT 
    'Functions' as type,
    routine_name as name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%payment%'
UNION ALL
SELECT 
    'Triggers' as type,
    trigger_name as name
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE '%payment%'; 