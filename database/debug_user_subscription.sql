-- Script para debugar assinatura do usuário
-- Substitua 'SEU_USER_ID' pelo ID do usuário

-- 1. Verificar todas as assinaturas do usuário
SELECT 
    us.id,
    us.user_id,
    us.plan_id,
    us.status,
    us.start_date,
    us.end_date,
    us.created_at,
    p.name as plan_name,
    p.display_name,
    p.max_ads,
    CASE 
        WHEN us.end_date IS NULL THEN 'SEM DATA DE FIM'
        WHEN us.end_date > NOW() THEN 'ATIVO (ainda não expirou)'
        ELSE 'EXPIRADO'
    END as status_validacao,
    NOW() as data_atual
FROM user_subscriptions us
JOIN plans p ON us.plan_id = p.id
WHERE us.user_id = 'SEU_USER_ID'
ORDER BY us.created_at DESC;

-- 2. Contar anúncios do usuário
SELECT 
    status,
    COUNT(*) as quantidade
FROM properties
WHERE user_id = 'SEU_USER_ID'
GROUP BY status;

-- 3. Testar a função RPC diretamente
SELECT * FROM get_user_active_plan('SEU_USER_ID');

-- 4. Testar a função can_user_create_ad
SELECT * FROM can_user_create_ad('SEU_USER_ID');

