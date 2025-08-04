-- Script de teste para verificar se a verificação de planos está funcionando
-- Execute este script no SQL Editor do Supabase para testar

-- 1. Verificar se o usuário tem plano ativo (substitua USER_ID pelo ID do seu usuário)
-- SELECT * FROM debug_user_plan_status('SEU_USER_ID_AQUI');

-- 2. Verificar se pode criar anúncio
-- SELECT * FROM can_user_create_ad('SEU_USER_ID_AQUI');

-- 3. Verificar plano ativo
-- SELECT * FROM get_user_active_plan('SEU_USER_ID_AQUI');

-- 4. Verificar anúncios atuais
-- SELECT COUNT(*) as total_anuncios FROM properties WHERE user_id = 'SEU_USER_ID_AQUI';

-- 5. Verificar assinatura ativa
-- SELECT 
--     us.*,
--     p.name as plan_name,
--     p.display_name,
--     p.max_ads
-- FROM user_subscriptions us
-- JOIN plans p ON us.plan_id = p.id
-- WHERE us.user_id = 'SEU_USER_ID_AQUI' 
-- AND us.status = 'active';

-- 6. Teste completo - substitua USER_ID pelo seu ID real
/*
-- Exemplo de uso (descomente e substitua o USER_ID):
DO $$
DECLARE
    user_uuid UUID := 'SEU_USER_ID_AQUI'; -- Substitua pelo seu ID
    plan_status RECORD;
    can_create RECORD;
    active_plan RECORD;
BEGIN
    -- Verificar status do plano
    SELECT * INTO plan_status FROM debug_user_plan_status(user_uuid);
    
    RAISE NOTICE 'Status do Plano:';
    RAISE NOTICE '  - Tem assinatura ativa: %', plan_status.has_active_subscription;
    RAISE NOTICE '  - Plano: %', plan_status.subscription_plan_name;
    RAISE NOTICE '  - Status: %', plan_status.subscription_status;
    RAISE NOTICE '  - Data fim: %', plan_status.subscription_end_date;
    RAISE NOTICE '  - Máximo anúncios: %', plan_status.plan_max_ads;
    RAISE NOTICE '  - Anúncios atuais: %', plan_status.current_ads_count;
    RAISE NOTICE '  - Pode criar anúncios: %', plan_status.can_create_ads;
    
    -- Verificar se pode criar anúncio
    SELECT * INTO can_create FROM can_user_create_ad(user_uuid);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Pode criar anúncio: %', can_create.can_create;
    RAISE NOTICE 'Motivo: %', can_create.reason;
    RAISE NOTICE 'Anúncios atuais: %', can_create.current_ads;
    RAISE NOTICE 'Máximo permitido: %', can_create.max_ads;
    RAISE NOTICE 'Plano: %', can_create.plan_name;
    
    -- Verificar plano ativo
    SELECT * INTO active_plan FROM get_user_active_plan(user_uuid);
    
    RAISE NOTICE '';
    RAISE NOTICE 'Plano Ativo:';
    RAISE NOTICE '  - Nome: %', active_plan.plan_name;
    RAISE NOTICE '  - Display: %', active_plan.display_name;
    RAISE NOTICE '  - Máximo anúncios: %', active_plan.max_ads;
    RAISE NOTICE '  - Preço: %', active_plan.price;
END $$;
*/

-- 7. Verificar se as funções estão funcionando corretamente
-- SELECT 
--     'check_ad_limit' as function_name,
--     pg_get_functiondef(oid) as function_definition
-- FROM pg_proc 
-- WHERE proname = 'check_ad_limit';

-- SELECT 
--     'can_user_create_ad' as function_name,
--     pg_get_functiondef(oid) as function_definition
-- FROM pg_proc 
-- WHERE proname = 'can_user_create_ad';

-- 8. Verificar triggers
-- SELECT 
--     trigger_name,
--     event_manipulation,
--     action_statement
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'properties';

-- 9. Verificar se a tabela user_subscriptions tem dados
-- SELECT COUNT(*) as total_subscriptions FROM user_subscriptions;
-- SELECT COUNT(*) as active_subscriptions FROM user_subscriptions WHERE status = 'active';

-- 10. Verificar se a tabela plans tem os dados corretos
-- SELECT * FROM plans WHERE is_active = true ORDER BY price; 