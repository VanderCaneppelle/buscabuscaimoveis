-- Sistema de Planos de Usuário
-- Este script cria toda a estrutura necessária para gerenciar planos e anúncios

-- 1. Tabela de planos (já existe, mas vamos garantir que tenha os dados corretos)
INSERT INTO plans (id, name, display_name, max_ads, price, features, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'free', 'Gratuito', 0, 0.00, ARRAY['Visualizar anúncios'], true),
('550e8400-e29b-41d4-a716-446655440002', 'bronze', 'Bronze', 5, 39.99, ARRAY['5 anúncios ativos', 'Suporte por email', 'Fotos ilimitadas'], true),
('550e8400-e29b-41d4-a716-446655440003', 'silver', 'Prata', 10, 59.90, ARRAY['10 anúncios ativos', 'Suporte prioritário', 'Destaque nos resultados', 'Relatórios básicos'], true),
('550e8400-e29b-41d4-a716-446655440004', 'gold', 'Ouro', 50, 99.90, ARRAY['50 anúncios ativos', 'Suporte 24/7', 'Destaque premium', 'Relatórios avançados', 'API de integração'], true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    max_ads = EXCLUDED.max_ads,
    price = EXCLUDED.price,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active;

-- 2. Tabela de assinaturas de usuário (user_subscriptions)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(user_id, status) WHERE status = 'active';

-- 4. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- 5. Função para obter o plano ativo do usuário
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
$$ LANGUAGE plpgsql;

-- 6. Função para contar anúncios ativos do usuário
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
$$ LANGUAGE plpgsql;

-- 7. Função para verificar se usuário pode criar anúncio
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
$$ LANGUAGE plpgsql;

-- 8. Função para associar usuário ao plano gratuito
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
$$ LANGUAGE plpgsql;

-- 9. Função para contratar/alterar plano
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
$$ LANGUAGE plpgsql;

-- 10. RLS Policies para user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias assinaturas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias assinaturas (para contratar planos)
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias assinaturas
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- 11. Trigger para associar plano gratuito automaticamente no cadastro
CREATE OR REPLACE FUNCTION auto_assign_free_plan()
RETURNS TRIGGER AS $$
BEGIN
    -- Associar plano gratuito automaticamente
    PERFORM assign_free_plan_to_user(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_free_plan_trigger ON auth.users;
CREATE TRIGGER auto_assign_free_plan_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_free_plan();

-- 12. Comentários para documentação
COMMENT ON TABLE user_subscriptions IS 'Assinaturas de planos dos usuários';
COMMENT ON FUNCTION get_user_active_plan(UUID) IS 'Retorna o plano ativo de um usuário';
COMMENT ON FUNCTION count_user_active_ads(UUID) IS 'Conta anúncios ativos de um usuário';
COMMENT ON FUNCTION can_user_create_ad(UUID) IS 'Verifica se usuário pode criar anúncio';
COMMENT ON FUNCTION assign_free_plan_to_user(UUID) IS 'Associa usuário ao plano gratuito';
COMMENT ON FUNCTION subscribe_user_to_plan(UUID, TEXT, INTEGER) IS 'Contrata/altera plano do usuário'; 