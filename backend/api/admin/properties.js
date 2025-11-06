import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

// Usar SERVICE_ROLE_KEY para bypass do RLS
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    console.log('🔍 PROPERTIES - Endpoint chamado!');
    console.log('🔍 PROPERTIES - Method:', req.method);
    console.log('🔍 PROPERTIES - Query:', req.query);
    console.log('🔍 PROPERTIES - Headers:', req.headers);
    
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = '', 
            propertyType = '', 
            city = '', 
            search = ''
        } = req.query;

        console.log('📋 Buscando propriedades para admin:', { page, limit, status, propertyType, city, search });

        // Construir query base (sem JOIN por enquanto)
        let query = supabase
            .from('properties')
            .select(`
                id,
                title,
                description,
                price,
                sale_price,
                property_type,
                transaction_type,
                bedrooms,
                bathrooms,
                parking_spaces,
                area,
                address,
                neighborhood,
                city,
                state,
                zip_code,
                latitude,
                longitude,
                images,
                video_urls,
                status,
                ad_status,
                created_at,
                updated_at,
                approved_at,
                rejected_at,
                rejection_reason,
                user_id,
                developer_id,
                ad_id
            `)
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (status) {
            query = query.eq('status', status);
        }
        
        if (propertyType) {
            query = query.eq('property_type', propertyType);
        }
        
        if (city) {
            query = query.ilike('city', `%${city}%`);
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Paginação
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: properties, error, count } = await query;

        if (error) {
            console.error('❌ Erro ao buscar propriedades:', error);
            return res.status(500).json({ 
                error: 'Database error',
                message: error.message 
            });
        }

        // Buscar total de registros para paginação
        const { count: totalCount } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true });

        console.log('✅ Propriedades encontradas:', properties?.length || 0);
        if (properties && properties.length > 0) {
            console.log('📦 Exemplo de propriedade retornada:', {
                id: properties[0].id,
                title: properties[0].title,
                address: properties[0].address,
                neighborhood: properties[0].neighborhood,
                city: properties[0].city,
                images: properties[0].images ? 'SIM' : 'NÃO'
            });
        }

        return res.status(200).json({
            success: true,
            data: properties || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount || 0,
                pages: Math.ceil((totalCount || 0) / limit)
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de propriedades:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

export default adminMiddleware(handler);
