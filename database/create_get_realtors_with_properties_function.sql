-- Função para buscar corretores que têm imóveis ativos
-- Retorna: id, full_name, email, property_count

CREATE OR REPLACE FUNCTION get_realtors_with_properties()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    property_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.email,
        COUNT(props.id) as property_count
    FROM profiles p
    INNER JOIN properties props ON props.user_id = p.id
    WHERE 
        p.is_realtor = true
        AND props.status = 'approved'
        AND props.ad_status = 'active'
    GROUP BY p.id, p.full_name, p.email
    ORDER BY p.full_name ASC;
END;
$$;

-- Permitir acesso público à função (somente leitura)
GRANT EXECUTE ON FUNCTION get_realtors_with_properties() TO anon, authenticated;

-- Comentário
COMMENT ON FUNCTION get_realtors_with_properties() IS 'Retorna lista de corretores que possuem imóveis ativos, com contagem de imóveis';

