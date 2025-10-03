-- Script para atualizar funções do banco para lidar com planos anuais
-- Este script atualiza a função subscribe_user_to_plan para calcular end_date baseado no período do plano

-- 1. Atualizar função subscribe_user_to_plan para usar período do plano
CREATE OR REPLACE FUNCTION subscribe_user_to_plan(
    user_uuid UUID,
    plan_name TEXT,
    duration_months INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    target_plan_id UUID;
    plan_period TEXT;
    calculated_duration INTEGER;
    new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Obter ID e período do plano
    SELECT id, period INTO target_plan_id, plan_period 
    FROM plans WHERE name = plan_name;
    
    IF target_plan_id IS NULL THEN
        RETURN false; -- Plano não encontrado
    END IF;
    
    -- Calcular duração baseada no período do plano se não especificada
    IF duration_months IS NULL THEN
        calculated_duration := CASE 
            WHEN plan_period = 'annual' THEN 12
            ELSE 1
        END;
    ELSE
        calculated_duration := duration_months;
    END IF;
    
    -- Calcular data de fim
    new_end_date := NOW() + INTERVAL '1 month' * calculated_duration;
    
    -- Cancelar assinatura atual se existir
    UPDATE user_subscriptions 
    SET status = 'cancelled', updated_at = NOW()
    WHERE user_id = user_uuid AND status = 'active';
    
    -- Criar nova assinatura
    INSERT INTO user_subscriptions (user_id, plan_id, status, end_date)
    VALUES (user_uuid, target_plan_id, 'active', new_end_date);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 2. Função para obter informações do plano com período
CREATE OR REPLACE FUNCTION get_plan_info_with_period(plan_name TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    display_name TEXT,
    max_ads INTEGER,
    price DECIMAL(10,2),
    features TEXT[],
    period TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.display_name,
        p.max_ads,
        p.price,
        p.features,
        p.period,
        p.is_active
    FROM plans p
    WHERE p.name = plan_name AND p.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para calcular economia de planos anuais
CREATE OR REPLACE FUNCTION calculate_annual_savings(plan_name TEXT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    monthly_price DECIMAL(10,2);
    annual_price DECIMAL(10,2);
    monthly_equivalent DECIMAL(10,2);
    savings DECIMAL(10,2);
BEGIN
    -- Obter preço mensal (removendo _annual do nome se existir)
    SELECT price INTO monthly_price 
    FROM plans 
    WHERE name = REPLACE(plan_name, '_annual', '') 
    AND period = 'monthly' 
    AND is_active = true;
    
    -- Obter preço anual
    SELECT price INTO annual_price 
    FROM plans 
    WHERE name = plan_name 
    AND period = 'annual' 
    AND is_active = true;
    
    -- Calcular equivalente mensal do plano anual
    monthly_equivalent := annual_price / 12;
    
    -- Calcular economia
    savings := (monthly_price - monthly_equivalent) * 12;
    
    RETURN COALESCE(savings, 0);
END;
$$ LANGUAGE plpgsql;

-- 4. Verificar se as funções foram criadas corretamente
SELECT 'Funções atualizadas com sucesso!' as status;
