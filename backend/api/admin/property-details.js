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
                property_type,
                city,
                status,
                ad_status,
                created_at,
                updated_at,
                user_id,
                latitude,
                longitude,
                address,
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
