import { adminMiddleware } from './middleware.js';
import { supabase } from '../../lib/supabase.js';

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { propertyId } = req.body;

        if (!propertyId) {
            return res.status(400).json({ error: 'Property ID is required' });
        }

        console.log('✅ Aprovando propriedade:', propertyId);

        // Atualizar status da propriedade
        const { data, error } = await supabase
            .from('properties')
            .update({
                status: 'approved',
                ad_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', propertyId)
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao aprovar propriedade:', error);
            return res.status(500).json({ 
                error: 'Database error',
                message: error.message 
            });
        }

        // Criar notificação para o usuário
        const { error: notificationError } = await supabase
            .from('in_app_notifications')
            .insert({
                user_id: data.user_id,
                type: 'property_approved',
                title: 'Anúncio Aprovado!',
                message: `Seu anúncio "${data.title}" foi aprovado e está ativo.`,
                data: {
                    property_id: propertyId,
                    property_title: data.title
                }
            });

        if (notificationError) {
            console.error('❌ Erro ao criar notificação:', notificationError);
        } else {
            console.log('✅ Notificação criada para o usuário');
        }

        console.log('✅ Propriedade aprovada com sucesso:', propertyId);

        return res.status(200).json({
            success: true,
            message: 'Property approved successfully',
            property: {
                id: data.id,
                title: data.title,
                status: data.status,
                ad_status: data.ad_status
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de aprovação:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

export default adminMiddleware(handler);
