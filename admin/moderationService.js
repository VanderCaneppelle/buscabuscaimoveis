/**
 * Serviço centralizado de moderação de anúncios (modo global)
 * Expõe window.ModerationService para ser usado em admin.js e property-details.js
 */
(function () {
    const BACKEND_BASE = (typeof window !== 'undefined' && typeof window.getBackendApiBase === 'function')
        ? window.getBackendApiBase()
        : (window.BACKEND_BASE || 'https://buscabusca.vercel.app');

    function getClient() {
        const client = window.supabaseClient;
        if (!client) throw new Error('Supabase client global não encontrado (window.supabaseClient)');
        return client;
    }

    async function sendPushNotification(propertyId, notificationType, reason = null) {
        const supabase = getClient();
        try {
            const { data: property, error: propError } = await supabase
                .from('properties')
                .select('user_id, title, ad_id')
                .eq('id', propertyId)
                .single();

            if (propError || !property) {
                console.error('Erro ao buscar propriedade para notificação:', propError);
                return;
            }

            let url, payload;

            if (notificationType === 'approved') {
                url = `${BACKEND_BASE}/api/notifications?action=property-approved`;
                payload = {
                    userId: property.user_id,
                    propertyId: propertyId,
                    propertyTitle: property.title,
                    adId: property.ad_id
                };
            } else if (notificationType === 'rejected') {
                url = `${BACKEND_BASE}/api/notifications?action=property-rejected`;
                payload = {
                    userId: property.user_id,
                    propertyId: propertyId,
                    propertyTitle: property.title,
                    adId: property.ad_id,
                    reason: reason || null
                };
            } else {
                console.error('Tipo de notificação inválido:', notificationType);
                return;
            }

            console.log(`📤 Enviando notificação de ${notificationType} para usuário ${property.user_id}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Erro ao enviar notificação: ${response.status}`);
            } else {
                console.log(`✅ Notificação de ${notificationType} enviada com sucesso`);
            }
        } catch (err) {
            console.error('Erro ao enviar notificação push:', err);
        }
    }

    async function approveProperty(propertyId) {
        const supabase = getClient();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            console.log(`✅ Aprovando anúncio ${propertyId}...`);

            const { error } = await supabase
                .from('properties')
                .update({
                    status: 'approved',
                    ad_status: 'active',
                    approved_at: new Date().toISOString(),
                    approved_by: user.id
                })
                .eq('id', propertyId);

            if (error) throw error;

            sendPushNotification(propertyId, 'approved').catch(err => {
                console.error('Erro ao enviar notificação (não crítico):', err);
            });

            console.log(`✅ Anúncio ${propertyId} aprovado e ativado com sucesso`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao aprovar propriedade:', error);
            throw error;
        }
    }

    async function rejectProperty(propertyId, reason = null) {
        const supabase = getClient();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            console.log(`❌ Rejeitando anúncio ${propertyId}...`);

            const { error } = await supabase
                .from('properties')
                .update({
                    status: 'rejected',
                    ad_status: 'inactive',
                    rejected_at: new Date().toISOString(),
                    rejected_by: user.id,
                    rejection_reason: reason || null
                })
                .eq('id', propertyId);

            if (error) throw error;

            sendPushNotification(propertyId, 'rejected', reason).catch(err => {
                console.error('Erro ao enviar notificação (não crítico):', err);
            });

            console.log(`❌ Anúncio ${propertyId} rejeitado com sucesso`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao rejeitar propriedade:', error);
            throw error;
        }
    }

    window.ModerationService = { approveProperty, rejectProperty };
})();
