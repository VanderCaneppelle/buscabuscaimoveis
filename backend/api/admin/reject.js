import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

// Usar SERVICE_ROLE_KEY para bypass do RLS
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { propertyId, reason } = req.body;

        if (!propertyId) {
            return res.status(400).json({ error: 'Property ID is required' });
        }

        console.log('❌ Rejeitando propriedade:', propertyId, 'Motivo:', reason);

        // Atualizar status da propriedade
        const { data, error } = await supabase
            .from('properties')
            .update({
                status: 'rejected',
                ad_status: 'inactive',
                updated_at: new Date().toISOString()
            })
            .eq('id', propertyId)
            .select('id, title, user_id')
            .single();

        if (error) {
            console.error('❌ Erro ao rejeitar propriedade:', error);
            return res.status(500).json({ 
                error: 'Database error',
                message: error.message 
            });
        }

        // Criar notificação para o usuário
        console.log('🔔 Criando notificação para user_id:', data.user_id);
        console.log('🔔 Título da propriedade:', data.title);
        console.log('🔔 Motivo da rejeição:', reason);
        
        const { error: notificationError } = await supabase
            .from('in_app_notifications')
            .insert({
                user_id: data.user_id,
                type: 'property_rejected',
                title: 'Anúncio Rejeitado',
                message: `Seu anúncio "${data.title}" foi rejeitado.${reason ? ` Motivo: ${reason}` : ''}`,
                data: {
                    property_id: propertyId,
                    property_title: data.title,
                    rejection_reason: reason
                }
            });

        if (notificationError) {
            console.error('❌ Erro ao criar notificação:', notificationError);
        } else {
            console.log('✅ Notificação de rejeição criada para o usuário');
        }

        // ✨ NOVO: Enviar push notification
        try {
            console.log('📱 Enviando push notification de rejeição...');
            const pushResponse = await fetch(`${process.env.API_BASE_URL || 'https://buscabuscaimoveis-qa.vercel.app'}/api/notifications?action=property-rejected`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: data.user_id,
                    propertyId: propertyId,
                    reason: reason
                })
            });

            if (pushResponse.ok) {
                console.log('✅ Push notification enviada com sucesso');
            } else {
                console.error('❌ Erro ao enviar push notification:', pushResponse.status);
            }
        } catch (pushError) {
            console.error('❌ Erro ao enviar push notification:', pushError);
        }

        console.log('✅ Propriedade rejeitada com sucesso:', propertyId);

        return res.status(200).json({
            success: true,
            message: 'Property rejected successfully',
            property: {
                id: data.id,
                title: data.title,
                status: data.status,
                ad_status: data.ad_status
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de rejeição:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}

export default adminMiddleware(handler);
