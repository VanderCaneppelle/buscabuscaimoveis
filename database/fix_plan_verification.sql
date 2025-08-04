-- Corrigir verificação de planos para permitir criação de anúncios
-- Este script corrige a função check_ad_limit e outras funções relacionadas

-- 1. Corrigir a função check_ad_limit para usar user_subscriptions em vez de subscriptions
CREATE OR REPLACE FUNCTION check_ad_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_plan_max_ads INTEGER;
    current_ads_count INTEGER;
BEGIN
    -- Verificar se é uma inserção de novo anúncio
    IF TG_OP = 'INSERT' THEN
        -- Buscar plano ativo do usuário usando user_subscriptions
        SELECT p.max_ads INTO user_plan_max_ads
        FROM user_subscriptions us
        JOIN plans p ON us.plan_id = p.id
        WHERE us.user_id = NEW.user_id 
        AND us.status = 'active'
        AND (us.end_date IS NULL OR us.end_date > NOW());
        
        -- Se não tem plano ativo, bloquear
        IF user_plan_max_ads IS NULL THEN
            RAISE EXCEPTION 'Usuário precisa de um plano ativo para criar anúncios';
        END IF;
        
        -- Se plano gratuito (max_ads = 0), bloquear
        IF user_plan_max_ads = 0 THEN
            RAISE EXCEPTION 'Plano gratuito não permite criar anúncios';
        END IF;
        
        -- Contar anúncios ativos do usuário (incluindo pending e approved)
        SELECT COUNT(*) INTO current_ads_count
        FROM properties
        WHERE user_id = NEW.user_id 
        AND status IN ('pending', 'approved');
        
        -- Verificar limite
        IF current_ads_count >= user_plan_max_ads THEN
            RAISE EXCEPTION 'Limite de % anúncios atingido para o seu plano', user_plan_max_ads;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar a função can_user_create_ad para incluir anúncios pending
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
    
    -- Contar anúncios ativos (incluindo pending e approved)
    SELECT COUNT(*) INTO current_ads_count
    FROM properties
    WHERE user_id = user_uuid 
    AND status IN ('pending', 'approved');
    
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
$$ LANGUAGE plpgsql;

-- 3. Atualizar a função count_user_active_ads para incluir pending
CREATE OR REPLACE FUNCTION count_user_active_ads(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO active_count
    FROM properties
    WHERE user_id = user_uuid 
    AND status IN ('pending', 'approved');
    
    RETURN COALESCE(active_count, 0);
END;
$$ LANGUAGE plpgsql;

-- 4. Verificar se o trigger existe e recriar se necessário
DROP TRIGGER IF EXISTS check_ad_limit_trigger ON properties;
CREATE TRIGGER check_ad_limit_trigger 
    BEFORE INSERT ON properties 
    FOR EACH ROW EXECUTE FUNCTION check_ad_limit();

-- 5. Função de debug para verificar o status do usuário
CREATE OR REPLACE FUNCTION debug_user_plan_status(user_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    has_active_subscription BOOLEAN,
    subscription_plan_name TEXT,
    subscription_status TEXT,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    plan_max_ads INTEGER,
    current_ads_count INTEGER,
    can_create_ads BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        CASE WHEN us.id IS NOT NULL THEN true ELSE false END as has_active_subscription,
        p.name as subscription_plan_name,
        us.status as subscription_status,
        us.end_date as subscription_end_date,
        p.max_ads as plan_max_ads,
        COALESCE(ads_count.count, 0) as current_ads_count,
        CASE 
            WHEN us.id IS NOT NULL AND us.status = 'active' AND (us.end_date IS NULL OR us.end_date > NOW()) AND p.max_ads > 0 AND COALESCE(ads_count.count, 0) < p.max_ads 
            THEN true 
            ELSE false 
        END as can_create_ads
    FROM auth.users u
    LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
    LEFT JOIN plans p ON us.plan_id = p.id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count
        FROM properties 
        WHERE status IN ('pending', 'approved')
        GROUP BY user_id
    ) ads_count ON u.id = ads_count.user_id
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentários para documentação
COMMENT ON FUNCTION check_ad_limit() IS 'Verifica se usuário pode criar anúncio baseado no plano ativo';
COMMENT ON FUNCTION can_user_create_ad(UUID) IS 'Verifica se usuário pode criar anúncio (incluindo pending)';
COMMENT ON FUNCTION count_user_active_ads(UUID) IS 'Conta anúncios ativos incluindo pending e approved';
COMMENT ON FUNCTION debug_user_plan_status(UUID) IS 'Função de debug para verificar status do plano do usuário'; 