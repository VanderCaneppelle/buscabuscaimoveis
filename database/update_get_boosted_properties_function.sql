-- =====================================================
-- ATUALIZAR FUNÇÃO get_boosted_properties()
-- Adiciona campos necessários para PropertyDetailsScreen
-- =====================================================

-- Remover função existente antes de recriar (necessário quando mudamos o tipo de retorno)
DROP FUNCTION IF EXISTS get_boosted_properties();

CREATE OR REPLACE FUNCTION get_boosted_properties()
RETURNS TABLE (
    property_id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL(10,2),
    sale_price DECIMAL(10,2),
    promotional_price DECIMAL(10,2),
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
    video_urls TEXT[],
    property_status TEXT,
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
        p.sale_price as promotional_price,
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
        COALESCE(p.video_urls, ARRAY[]::TEXT[]) as video_urls,
        p.status as property_status,
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
-- CORRIGIR FUNÇÃO create_boost() - Corrige sintaxe SQL
-- =====================================================

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
        CASE WHEN payment_uuid IS NOT NULL THEN 'active' ELSE 'pending' END,
        payment_uuid,
        boost_plan.price
    ) RETURNING id INTO new_boost_id;
    
    RETURN new_boost_id;
END;
$$ LANGUAGE plpgsql;

