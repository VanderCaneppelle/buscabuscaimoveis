-- =====================================================
-- SCHEMA DO BANCO DE DADOS - BUSCABUSCAIMOVEIS
-- =====================================================

-- =====================================================
-- TABELA DE PLANOS
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- 'bronze', 'prata', 'ouro'
    display_name TEXT NOT NULL, -- 'Plano Bronze', 'Plano Prata', 'Plano Ouro'
    max_ads INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    features TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE ASSINATURAS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired', 'pending'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    mercado_pago_subscription_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint para garantir que um usuário tenha apenas uma assinatura ativa
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active 
ON subscriptions(user_id) WHERE status = 'active';

-- =====================================================
-- TABELA DE IMÓVEIS/PROPRIEDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    property_type TEXT NOT NULL, -- 'casa', 'apartamento', 'terreno', 'comercial'
    transaction_type TEXT NOT NULL, -- 'venda', 'aluguel'
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER,
    area DECIMAL(8,2), -- em m²
    address TEXT NOT NULL,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    images TEXT[], -- URLs das imagens
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'inactive'
    admin_notes TEXT, -- Notas do administrador
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE PAGAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
    payment_method TEXT, -- 'pix', 'boleto', 'credit_card'
    mercado_pago_payment_id TEXT,
    mercado_pago_preference_id TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE FAVORITOS
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, property_id)
);

-- =====================================================
-- TABELA DE MENSAGENS/CONTATOS
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    subject TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA DE AGENDAMENTOS DE VISITA
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON appointments(property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);

-- =====================================================
-- DADOS INICIAIS - PLANOS
-- =====================================================
INSERT INTO plans (name, display_name, max_ads, price, features) VALUES
    ('bronze', 'Plano Bronze', 2, 29.90, ARRAY['2 anúncios ativos', 'Suporte por email', 'Estatísticas básicas']),
    ('prata', 'Plano Prata', 5, 49.90, ARRAY['5 anúncios ativos', 'Suporte prioritário', 'Estatísticas avançadas', 'Destaque nos resultados']),
    ('ouro', 'Plano Ouro', 15, 99.90, ARRAY['15 anúncios ativos', 'Suporte VIP', 'Estatísticas completas', 'Destaque premium', 'Relatórios personalizados'])
ON CONFLICT (name) DO NOTHING;

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
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar limite de anúncios
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
CREATE TRIGGER check_ad_limit_trigger BEFORE INSERT ON properties FOR EACH ROW EXECUTE FUNCTION check_ad_limit(); 