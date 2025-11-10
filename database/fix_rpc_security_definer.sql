-- =====================================================
-- FIX: Adicionar SECURITY DEFINER às funções RPC
-- =====================================================
-- Este script corrige o problema de RLS bloqueando as funções RPC
-- ao adicionar SECURITY DEFINER para que elas executem com privilégios elevados

-- 1. Função para obter o plano ativo do usuário
CREATE OR REPLACE FUNCTION get_user_active_plan(user_uuid UUID)
RETURNS TABLE (
    plan_id UUID,
    plan_name TEXT,
    display_name TEXT,
    max_ads INTEGER,
    price NUMERIC,
    features TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.display_name,
        p.max_ads,
        p.price,
        p.features
    FROM user_subscriptions us
    JOIN plans p ON us.plan_id = p.id
    WHERE us.user_id = user_uuid 
    AND us.status = 'active'
    AND (us.end_date IS NULL OR us.end_date > NOW())
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para contar anúncios ativos do usuário
CREATE OR REPLACE FUNCTION count_user_active_ads(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM properties
    WHERE user_id = user_uuid 
    AND status = 'approved';
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para verificar se usuário pode criar anúncio
CREATE OR REPLACE FUNCTION can_user_create_ad(user_uuid UUID)
RETURNS TABLE (
    can_create BOOLEAN,
    reason TEXT,
    current_ads INTEGER,
    max_ads INTEGER,
    plan_name TEXT
) AS $$
DECLARE
    user_plan RECORD;
    current_ads_count INTEGER;
BEGIN
    -- Obter plano ativo do usuário
    SELECT * INTO user_plan FROM get_user_active_plan(user_uuid);
    
    -- Se não tem plano ativo, usar plano gratuito
    IF user_plan IS NULL THEN
        SELECT * INTO user_plan FROM plans WHERE name = 'free';
    END IF;
    
    -- Contar anúncios ativos
    current_ads_count := count_user_active_ads(user_uuid);
    
    -- Verificar se pode criar
    IF user_plan.max_ads = 0 THEN
        RETURN QUERY SELECT 
            false as can_create,
            'Plano gratuito não permite criar anúncios' as reason,
            current_ads_count as current_ads,
            user_plan.max_ads as max_ads,
            user_plan.display_name as plan_name;
    ELSIF current_ads_count >= user_plan.max_ads THEN
        RETURN QUERY SELECT 
            false as can_create,
            'Limite de anúncios atingido' as reason,
            current_ads_count as current_ads,
            user_plan.max_ads as max_ads,
            user_plan.display_name as plan_name;
    ELSE
        RETURN QUERY SELECT 
            true as can_create,
            'Pode criar anúncio' as reason,
            current_ads_count as current_ads,
            user_plan.max_ads as max_ads,
            user_plan.display_name as plan_name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para associar usuário ao plano gratuito
CREATE OR REPLACE FUNCTION assign_free_plan_to_user(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Obter ID do plano gratuito
    SELECT id INTO free_plan_id FROM plans WHERE name = 'free';
    
    -- Verificar se já tem uma assinatura ativa
    IF EXISTS (
        SELECT 1 FROM user_subscriptions 
        WHERE user_id = user_uuid AND status = 'active'
    ) THEN
        RETURN false; -- Já tem plano ativo
    END IF;
    
    -- Criar assinatura gratuita
    INSERT INTO user_subscriptions (user_id, plan_id, status, end_date)
    VALUES (user_uuid, free_plan_id, 'active', NULL);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para contratar/alterar plano
CREATE OR REPLACE FUNCTION subscribe_user_to_plan(
    user_uuid UUID,
    plan_name TEXT,
    duration_months INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
    target_plan_id UUID;
    new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Obter ID do plano
    SELECT id INTO target_plan_id FROM plans WHERE name = plan_name;
    
    IF target_plan_id IS NULL THEN
        RETURN false; -- Plano não encontrado
    END IF;
    
    -- Calcular data de fim
    new_end_date := NOW() + INTERVAL '1 month' * duration_months;
    
    -- Cancelar assinatura atual se existir
    UPDATE user_subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = user_uuid AND status = 'active';
    
    -- Criar nova assinatura
    INSERT INTO user_subscriptions (user_id, plan_id, status, end_date)
    VALUES (user_uuid, target_plan_id, 'active', new_end_date);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Verificar se as funções foram atualizadas corretamente
SELECT 
    routine_name as function_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_user_active_plan',
    'count_user_active_ads',
    'can_user_create_ad',
    'assign_free_plan_to_user',
    'subscribe_user_to_plan'
)
ORDER BY routine_name;

