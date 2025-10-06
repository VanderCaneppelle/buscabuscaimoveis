-- =====================================================
-- SISTEMA DE IMPULSIONAMENTO DE ANÚNCIOS
-- =====================================================
-- Este script cria a estrutura completa para impulsionar anúncios

-- =====================================================
-- 1. TABELA DE IMPULSIONAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS property_boosts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_days INTEGER NOT NULL CHECK (duration_days >= 1 AND duration_days <= 7),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    payment_id UUID REFERENCES payments(id),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_property_boosts_property_id ON property_boosts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_boosts_user_id ON property_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_property_boosts_status ON property_boosts(status);
CREATE INDEX IF NOT EXISTS idx_property_boosts_active ON property_boosts(property_id, status, end_date) 
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_property_boosts_dates ON property_boosts(start_date, end_date);

-- =====================================================
-- 3. TABELA DE PLANOS DE IMPULSIONAMENTO
-- =====================================================
CREATE TABLE IF NOT EXISTS boost_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    duration_days INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. INSERIR PLANOS DE IMPULSIONAMENTO PADRÃO
-- =====================================================
INSERT INTO boost_plans (name, duration_days, price, description) VALUES
('boost_1_day', 1, 9.90, 'Impulsione seu anúncio por 1 dia'),
('boost_3_days', 3, 24.90, 'Impulsione seu anúncio por 3 dias - Economia de 17%'),
('boost_7_days', 7, 49.90, 'Impulsione seu anúncio por 7 dias - Economia de 28%')
ON CONFLICT (name) DO UPDATE SET
    duration_days = EXCLUDED.duration_days,
    price = EXCLUDED.price,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- =====================================================
-- 5. FUNÇÕES AUXILIARES
-- =====================================================

-- Verificar se anúncio tem boost ativo
CREATE OR REPLACE FUNCTION has_active_boost(property_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    boost_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM property_boosts
        WHERE property_id = property_uuid
        AND status = 'active'
        AND end_date > NOW()
    ) INTO boost_exists;
    
    RETURN boost_exists;
END;
$$ LANGUAGE plpgsql;

-- Obter boost ativo de um anúncio
CREATE OR REPLACE FUNCTION get_active_boost(property_uuid UUID)
RETURNS TABLE (
    id UUID,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    duration_days INTEGER,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pb.id,
        pb.start_date,
        pb.end_date,
        pb.duration_days,
        GREATEST(0, EXTRACT(DAY FROM (pb.end_date - NOW()))::INTEGER) as days_remaining
    FROM property_boosts pb
    WHERE pb.property_id = property_uuid
    AND pb.status = 'active'
    AND pb.end_date > NOW()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Criar novo boost
CREATE OR REPLACE FUNCTION create_boost(
    property_uuid UUID,
    user_uuid UUID,
    plan_name TEXT,
    payment_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    boost_plan RECORD;
    new_boost_id UUID;
    boost_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Buscar plano de boost
    SELECT * INTO boost_plan FROM boost_plans WHERE name = plan_name AND is_active = true;
    
    IF boost_plan IS NULL THEN
        RAISE EXCEPTION 'Plano de boost não encontrado';
    END IF;
    
    -- Verificar se a propriedade existe e pertence ao usuário
    IF NOT EXISTS (
        SELECT 1 FROM properties 
        WHERE id = property_uuid 
        AND user_id = user_uuid
        AND status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Propriedade não encontrada ou não aprovada';
    END IF;
    
    -- Cancelar boost ativo anterior (se existir)
    UPDATE property_boosts
    SET status = 'cancelled', updated_at = NOW()
    WHERE property_id = property_uuid
    AND status = 'active';
    
    -- Calcular data de término
    boost_end_date := NOW() + INTERVAL '1 day' * boost_plan.duration_days;
    
    -- Criar novo boost
    INSERT INTO property_boosts (
        property_id,
        user_id,
        end_date,
        duration_days,
        status,
        payment_id,
        amount
    ) VALUES (
        property_uuid,
        user_uuid,
        boost_end_date,
        boost_plan.duration_days,
        payment_uuid IS NOT NULL ? 'active' : 'pending',
        payment_uuid,
        boost_plan.price
    ) RETURNING id INTO new_boost_id;
    
    RETURN new_boost_id;
END;
$$ LANGUAGE plpgsql;

-- Ativar boost após pagamento
CREATE OR REPLACE FUNCTION activate_boost(boost_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE property_boosts
    SET status = 'active', updated_at = NOW()
    WHERE id = boost_uuid
    AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Expirar boosts automaticamente
CREATE OR REPLACE FUNCTION expire_old_boosts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE property_boosts
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND end_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Buscar anúncios em destaque (com boost ativo)
CREATE OR REPLACE FUNCTION get_boosted_properties()
RETURNS TABLE (
    property_id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    property_type TEXT,
    transaction_type TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER,
    area DECIMAL(10,2),
    address TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    images TEXT[],
    property_status TEXT,
    property_views INTEGER,
    property_created_at TIMESTAMP WITH TIME ZONE,
    user_id UUID,
    boost_id UUID,
    boost_end_date TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as property_id,
        p.title,
        p.description,
        p.price,
        p.sale_price,
        p.property_type,
        p.transaction_type,
        p.bedrooms,
        p.bathrooms,
        p.parking_spaces,
        p.area,
        p.address,
        p.neighborhood,
        p.city,
        p.state,
        p.zip_code,
        p.latitude,
        p.longitude,
        p.images,
        p.status as property_status,
        p.views as property_views,
        p.created_at as property_created_at,
        p.user_id,
        pb.id as boost_id,
        pb.end_date as boost_end_date,
        GREATEST(0, EXTRACT(DAY FROM (pb.end_date - NOW()))::INTEGER) as days_remaining
    FROM properties p
    INNER JOIN property_boosts pb ON pb.property_id = p.id
    WHERE p.status = 'approved'
    AND pb.status = 'active'
    AND pb.end_date > NOW()
    ORDER BY pb.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE property_boosts ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios boosts
DROP POLICY IF EXISTS "Users can view own boosts" ON property_boosts;
CREATE POLICY "Users can view own boosts" ON property_boosts
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar boosts para seus anúncios
DROP POLICY IF EXISTS "Users can create boosts" ON property_boosts;
CREATE POLICY "Users can create boosts" ON property_boosts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios boosts
DROP POLICY IF EXISTS "Users can update own boosts" ON property_boosts;
CREATE POLICY "Users can update own boosts" ON property_boosts
    FOR UPDATE USING (auth.uid() = user_id);

-- Permitir leitura pública de boosts ativos para exibir destaques
DROP POLICY IF EXISTS "Public can view active boosts" ON property_boosts;
CREATE POLICY "Public can view active boosts" ON property_boosts
    FOR SELECT USING (status = 'active' AND end_date > NOW());

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_property_boosts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_property_boosts_timestamp ON property_boosts;
CREATE TRIGGER update_property_boosts_timestamp
    BEFORE UPDATE ON property_boosts
    FOR EACH ROW
    EXECUTE FUNCTION update_property_boosts_updated_at();

-- =====================================================
-- 8. VERIFICAÇÕES
-- =====================================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
    -- Verificar tabela property_boosts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'property_boosts') THEN
        RAISE NOTICE '✅ Tabela property_boosts criada';
    ELSE
        RAISE EXCEPTION '❌ Tabela property_boosts não foi criada';
    END IF;

    -- Verificar tabela boost_plans
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'boost_plans') THEN
        RAISE NOTICE '✅ Tabela boost_plans criada';
    ELSE
        RAISE EXCEPTION '❌ Tabela boost_plans não foi criada';
    END IF;

    -- Verificar planos inseridos
    IF (SELECT COUNT(*) FROM boost_plans) >= 3 THEN
        RAISE NOTICE '✅ Planos de boost inseridos';
    ELSE
        RAISE EXCEPTION '❌ Planos de boost não foram inseridos';
    END IF;
END $$;

-- Mostrar resumo
SELECT 
    'property_boosts' as tabela,
    COUNT(*) as registros
FROM property_boosts
UNION ALL
SELECT 
    'boost_plans' as tabela,
    COUNT(*) as registros
FROM boost_plans;

-- Mostrar planos disponíveis
SELECT 
    name,
    duration_days || ' dias' as duracao,
    'R$ ' || price::TEXT as preco,
    description
FROM boost_plans
WHERE is_active = true
ORDER BY duration_days;

