-- =====================================================
-- FEATURES AVANÇADAS - EXECUTAR DEPOIS DO SCHEMA BÁSICO
-- =====================================================

-- =====================================================
-- CONSTRAINTS AVANÇADAS
-- =====================================================

-- Constraint para garantir que um usuário tenha apenas uma assinatura ativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active 
ON subscriptions(user_id) WHERE status = 'active';

-- Constraint para evitar favoritos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique 
ON favorites(user_id, property_id);

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÇÃO PARA VERIFICAR LIMITE DE ANÚNCIOS
-- =====================================================
CREATE OR REPLACE FUNCTION check_ad_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_plan_max_ads INTEGER;
    current_ads_count INTEGER;
BEGIN
    -- Verificar se é uma inserção de novo anúncio
    IF TG_OP = 'INSERT' THEN
        -- Buscar plano ativo do usuário
        SELECT p.max_ads INTO user_plan_max_ads
        FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.user_id = NEW.user_id 
        AND s.status = 'active'
        AND s.payment_status = 'paid';
        
        -- Se não tem plano ativo, bloquear
        IF user_plan_max_ads IS NULL THEN
            RAISE EXCEPTION 'Usuário precisa de um plano ativo para criar anúncios';
        END IF;
        
        -- Contar anúncios ativos do usuário
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

-- Trigger para verificar limite de anúncios
CREATE TRIGGER check_ad_limit_trigger 
    BEFORE INSERT ON properties 
    FOR EACH ROW EXECUTE FUNCTION check_ad_limit();

-- =====================================================
-- FUNÇÕES PARA VERIFICAR PERMISSÕES
-- =====================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter usuário atual
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 