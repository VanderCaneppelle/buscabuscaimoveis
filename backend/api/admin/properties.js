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
                property_type,
                city,
                status,
                ad_status,
                created_at,
                updated_at,
                user_id
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
