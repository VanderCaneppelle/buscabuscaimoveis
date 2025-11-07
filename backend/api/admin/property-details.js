import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    console.log('🔍 PROPERTY-DETAILS - Endpoint chamado!');
    console.log('🔍 PROPERTY-DETAILS - Method:', req.method);
    console.log('🔍 PROPERTY-DETAILS - Query:', req.query);
    
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ 
                error: 'Property ID is required' 
            });
        }

        console.log('🔍 PROPERTY-DETAILS - Buscando propriedade:', id);

        // Buscar propriedade com dados completos
        const { data: property, error } = await supabase
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
                ad_id,
                admin_notes
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('❌ PROPERTY-DETAILS - Erro ao buscar propriedade:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch property',
                details: error.message 
            });
        }

        if (!property) {
            console.error('❌ PROPERTY-DETAILS - Propriedade não encontrada:', id);
            return res.status(404).json({ 
                error: 'Property not found' 
            });
        }

        console.log('✅ PROPERTY-DETAILS - Propriedade encontrada:', property.id);
        console.log('📦 PROPERTY-DETAILS - Dados retornados:', {
            id: property.id,
            title: property.title,
            address: property.address,
            neighborhood: property.neighborhood,
            city: property.city,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            images: property.images ? 'SIM' : 'NÃO',
            video_urls: property.video_urls ? 'SIM' : 'NÃO'
        });

        return res.status(200).json({
            success: true,
            data: property
        });

    } catch (error) {
        console.error('❌ PROPERTY-DETAILS - Erro interno:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

export default adminMiddleware(handler);
