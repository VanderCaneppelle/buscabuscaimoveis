-- Função para buscar construtoras que têm imóveis ativos
-- Retorna: id, name, full_name, city_name, city_uf, property_count

CREATE OR REPLACE FUNCTION get_developers_with_properties()
RETURNS TABLE (
    id UUID,
    name TEXT,
    full_name TEXT,
    city_name TEXT,
    city_uf TEXT,
    property_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.full_name,
        d.city_name,
        d.city_uf,
        COUNT(p.id) as property_count
    FROM developers d
    INNER JOIN properties p ON p.developer_id = d.id
    WHERE 
        d.is_active = true
        AND p.status = 'approved'
        AND p.ad_status = 'active'
    GROUP BY d.id, d.name, d.full_name, d.city_name, d.city_uf
    ORDER BY d.full_name ASC;
END;
$$;

-- Permitir acesso público à função (somente leitura)
GRANT EXECUTE ON FUNCTION get_developers_with_properties() TO anon, authenticated;

-- Comentário
COMMENT ON FUNCTION get_developers_with_properties() IS 'Retorna lista de construtoras que possuem imóveis ativos, com contagem de imóveis';

