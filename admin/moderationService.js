/**
 * Serviço centralizado de moderação de anúncios (modo global)
 * Expõe window.ModerationService para ser usado em admin.js e property-details.js
 */
(function () {
    console.log('🔍 MODERATION - Iniciando ModerationService...');
    
    const BACKEND_BASE = (typeof window !== 'undefined' && typeof window.getBackendApiBase === 'function')
        ? window.getBackendApiBase()
        : (window.BACKEND_BASE || process.env.EXPO_PUBLIC_API_BASE_URL);
    
    console.log('🔍 MODERATION - BACKEND_BASE:', BACKEND_BASE);

    function getClient() {
        // ✨ NOVO: Usar API segura em vez de Supabase direto
        console.log('🔍 MODERATION - Usando API segura em vez de Supabase direto');
        return null; // Não precisamos mais do cliente Supabase
    }

    async function sendPushNotification(propertyId, notificationType, reason = null) {
        // ✨ NOVO: Buscar dados da propriedade via API segura
        try {
            console.log('🔍 MODERATION - Buscando dados da propriedade para notificação:', propertyId);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('❌ MODERATION - Token não encontrado');
                return;
            }

            const propertyResponse = await fetch(`${BACKEND_BASE}/api/admin/property-details?id=${propertyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!propertyResponse.ok) {
                console.error('❌ MODERATION - Erro ao buscar propriedade:', propertyResponse.status);
                return;
            }

            const propertyResult = await propertyResponse.json();
            if (!propertyResult.success || !propertyResult.data) {
                console.error('❌ MODERATION - Propriedade não encontrada');
                return;
            }

            const property = propertyResult.data;

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

    // ✨ NOVO: Enviar notificação in-app
    async function sendInAppNotification(propertyId, notificationType, reason = null) {
        // ✨ NOVO: Buscar dados da propriedade via API segura
        try {
            console.log('🔍 MODERATION - Buscando dados da propriedade para notificação in-app:', propertyId);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('❌ MODERATION - Token não encontrado');
                return;
            }

            const propertyResponse = await fetch(`${BACKEND_BASE}/api/admin/property-details?id=${propertyId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!propertyResponse.ok) {
                console.error('❌ MODERATION - Erro ao buscar propriedade:', propertyResponse.status);
                return;
            }

            const propertyResult = await propertyResponse.json();
            if (!propertyResult.success || !propertyResult.data) {
                console.error('❌ MODERATION - Propriedade não encontrada');
                return;
            }

            const property = propertyResult.data;

            let url, payload;

            if (notificationType === 'approved') {
                url = `${BACKEND_BASE}/api/in-app-notifications?action=create`;
                payload = {
                    userId: property.user_id,
                    type: 'property_approved',
                    title: '✅ Anúncio Aprovado!',
                    message: `Seu anúncio "${property.title}" foi aprovado e agora está visível para todos!`,
                    data: { 
                        property_id: propertyId,
                        property_title: property.title,
                        action: 'view_property'
                    }
                };
            } else if (notificationType === 'rejected') {
                url = `${BACKEND_BASE}/api/in-app-notifications?action=create`;
                const message = reason 
                    ? `Seu anúncio "${property.title}" foi rejeitado. Motivo: ${reason}`
                    : `Seu anúncio "${property.title}" foi rejeitado. Entre em contato para mais informações.`;
                
                payload = {
                    userId: property.user_id,
                    type: 'property_rejected',
                    title: '❌ Anúncio Rejeitado',
                    message: message,
                    data: { 
                        property_id: propertyId,
                        property_title: property.title,
                        reason: reason || 'Não especificado',
                        action: 'view_property'
                    }
                };
            } else {
                console.error('Tipo de notificação inválido:', notificationType);
                return;
            }

            console.log(`📱 Criando notificação in-app de ${notificationType} para usuário ${property.user_id}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error(`Erro ao criar notificação in-app: ${response.status}`);
            } else {
                console.log(`✅ Notificação in-app de ${notificationType} criada com sucesso`);
            }
        } catch (err) {
            console.error('Erro ao enviar notificação in-app:', err);
        }
    }

    async function approveProperty(propertyId) {
        try {
            console.log('🔍 MODERATION - Iniciando aprovação:', propertyId);
            
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('❌ MODERATION - Token não encontrado');
                throw new Error('Token de autenticação não encontrado');
            }

            console.log('🔍 MODERATION - Token encontrado:', token ? 'SIM' : 'NÃO');
            console.log(`✅ MODERATION - Aprovando anúncio ${propertyId}...`);

            // Buscar user_id da propriedade primeiro
            console.log('🔍 MODERATION - Buscando propriedade para aprovação...');
            const propertyResponse = await fetch(`${BACKEND_BASE}/api/admin/properties?page=1&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('🔍 MODERATION - Resposta da busca:', propertyResponse.status);
            if (!propertyResponse.ok) {
                console.error('❌ MODERATION - Erro ao buscar propriedade:', propertyResponse.status);
                throw new Error('Erro ao buscar propriedade');
            }

            const propertyData = await propertyResponse.json();
            console.log('🔍 MODERATION - Dados recebidos:', propertyData.data?.length || 0, 'propriedades');
            
            const property = propertyData.data?.find(p => p.id === propertyId);
            console.log('🔍 MODERATION - Propriedade encontrada:', !!property);
            
            if (!property) {
                console.error('❌ MODERATION - Propriedade não encontrada na lista');
                throw new Error('Propriedade não encontrada');
            }

            // Aprovar via API
            console.log('🔍 MODERATION - Chamando API de aprovação...');
            const response = await fetch(`${BACKEND_BASE}/api/admin/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    propertyId: propertyId,
                    userId: property.user_id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao aprovar propriedade');
            }

            console.log(`✅ Anúncio ${propertyId} aprovado e ativado com sucesso`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao aprovar propriedade:', error);
            throw error;
        }
    }

    async function rejectProperty(propertyId, reason = null) {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                throw new Error('Token de autenticação não encontrado');
            }

            console.log(`❌ Rejeitando anúncio ${propertyId}...`);

            // Buscar user_id da propriedade primeiro
            const propertyResponse = await fetch(`${BACKEND_BASE}/api/admin/properties?page=1&limit=1000`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!propertyResponse.ok) {
                throw new Error('Erro ao buscar propriedade');
            }

            const propertyData = await propertyResponse.json();
            const property = propertyData.data?.find(p => p.id === propertyId);
            
            if (!property) {
                throw new Error('Propriedade não encontrada');
            }

            // Rejeitar via API
            const response = await fetch(`${BACKEND_BASE}/api/admin/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    propertyId: propertyId,
                    userId: property.user_id,
                    reason: reason
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao rejeitar propriedade');
            }

            console.log(`❌ Anúncio ${propertyId} rejeitado com sucesso`);
            return { success: true };
        } catch (error) {
            console.error('Erro ao rejeitar propriedade:', error);
            throw error;
        }
    }

    // 🔍 DEBUG: Log antes de exportar
    console.log('🔍 MODERATION - Exportando ModerationService...');
    console.log('🔍 MODERATION - approveProperty:', typeof approveProperty);
    console.log('🔍 MODERATION - rejectProperty:', typeof rejectProperty);
    
    window.ModerationService = { approveProperty, rejectProperty };
    
    // 🔍 DEBUG: Log após exportar
    console.log('🔍 MODERATION - ModerationService exportado:', window.ModerationService);
})();
