import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handleGet(req, res) {
    console.log('🔍 PROPERTY-DETAILS - GET - Buscando propriedade');
    
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ 
                success: false,
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
                success: false,
                error: 'Failed to fetch property',
                details: error.message 
            });
        }

        if (!property) {
            console.error('❌ PROPERTY-DETAILS - Propriedade não encontrada:', id);
            return res.status(404).json({ 
                success: false,
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
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
}

async function handlePut(req, res) {
    console.log('🔍 PROPERTY-DETAILS - PUT - Atualizando propriedade');
    
    try {
        const { id } = req.query;
        const { admin_notes } = req.body;
        
        if (!id) {
            return res.status(400).json({ 
                success: false,
                error: 'Property ID is required' 
            });
        }

        // Validar que admin_notes foi fornecido
        if (admin_notes === undefined) {
            return res.status(400).json({ 
                success: false,
                error: 'admin_notes is required' 
            });
        }

        console.log('🔍 PROPERTY-DETAILS - Atualizando notas da propriedade:', id);

        // Atualizar apenas admin_notes
        const { data: property, error } = await supabase
            .from('properties')
            .update({ 
                admin_notes: admin_notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('❌ PROPERTY-DETAILS - Erro ao atualizar propriedade:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Failed to update property',
                details: error.message 
            });
        }

        if (!property) {
            console.error('❌ PROPERTY-DETAILS - Propriedade não encontrada:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Property not found' 
            });
        }

        console.log('✅ PROPERTY-DETAILS - Propriedade atualizada:', property.id);

        return res.status(200).json({
            success: true,
            message: 'Notas do admin atualizadas com sucesso',
            data: property
        });

    } catch (error) {
        console.error('❌ PROPERTY-DETAILS - Erro interno:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
}

async function handler(req, res) {
    console.log('🔍 PROPERTY-DETAILS - Endpoint chamado!');
    console.log('🔍 PROPERTY-DETAILS - Method:', req.method);
    console.log('🔍 PROPERTY-DETAILS - Query:', req.query);
    
    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'PUT':
                return await handlePut(req, res);
            default:
                res.setHeader('Allow', ['GET', 'PUT']);
                return res.status(405).json({
                    success: false,
                    error: 'Método não permitido'
                });
        }
    } catch (error) {
        console.error('❌ PROPERTY-DETAILS - Erro inesperado:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            details: error.message 
        });
    }
}

export default adminMiddleware(handler);
