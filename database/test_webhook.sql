-- =====================================================
-- TESTE DO WEBHOOK DO SUPABASE
-- =====================================================

-- 1. Verificar se as funções foram criadas
SELECT 
    routine_name, 
    routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('process_mercado_pago_webhook', 'update_payment_from_webhook');

-- 2. Verificar se o trigger foi criado
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_process_mercado_pago_webhook';

-- 3. Testar a função RPC com dados simulados
SELECT update_payment_from_webhook(
    '{
        "preference_id": "256582298-b22900b0-1234-5678-9abc-def123456789",
        "id": "123456789",
        "status": "approved"
    }'::jsonb
);

-- 4. Verificar pagamentos pendentes
SELECT 
    id,
    user_id,
    amount,
    status,
    mercado_pago_preference_id,
    mercado_pago_payment_id,
    description,
    created_at
FROM payments 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar assinaturas ativas
SELECT 
    us.id,
    us.user_id,
    us.plan_id,
    us.status,
    us.start_date,
    us.end_date,
    p.name as plan_name,
    p.display_name as plan_display_name
FROM user_subscriptions us
JOIN plans p ON us.plan_id = p.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC; 