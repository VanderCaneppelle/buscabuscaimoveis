import { supabase } from './supabase.js';
import axios from 'axios';

export class NotificationService {
    constructor() {
        this.expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    }

    // Registrar token do dispositivo
    async registerDeviceToken(token, userId, deviceInfo) {
        try {
            console.log(`🔄 Registrando token para usuário ${userId}: ${token.substring(0, 30)}...`);

            const nowIso = new Date().toISOString();

            // 1) Upsert por token (garante reatribuição de token ao novo usuário)
            const { data: upsertData, error: upsertError } = await supabase
                .from('device_tokens')
                .upsert({
                    token,
                    user_id: userId,
                    device_info: deviceInfo,
                    is_active: true,
                    updated_at: nowIso,
                    created_at: nowIso
                }, { onConflict: 'token' })
                .select();

            if (upsertError) {
                console.error('❌ Erro no upsert do token:', upsertError);
                return { success: false, error: upsertError.message };
            }

            console.log('✅ Upsert de token concluído');

            // 2) Desativar outros tokens do MESMO usuário (mantendo apenas este token ativo)
            const { error: deactivateOthersError } = await supabase
                .from('device_tokens')
                .update({ is_active: false, updated_at: nowIso })
                .eq('user_id', userId)
                .neq('token', token)
                .eq('is_active', true);

            if (deactivateOthersError) {
                console.error('❌ Erro ao desativar outros tokens do usuário:', deactivateOthersError);
                // continua mesmo assim
            }

            return { success: true, data: upsertData };
        } catch (error) {
            console.error('❌ Erro ao registrar token:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar notificação push
    async sendPushNotification(token, title, body, data = {}) {
        try {
            // Verificar se é um token mock (desenvolvimento)
            // Tokens mock conhecidos do desenvolvimento
            const knownMockTokens = [
                '2j39xi7l3', // Token mock conhecido
                '3femvfllk'  // Outro token mock conhecido
            ];

            const isMockToken = knownMockTokens.some(mockToken => token.includes(mockToken));

            if (isMockToken) {
                console.log('🧪 Token mock detectado - simulando envio bem-sucedido');
                return {
                    success: true,
                    data: {
                        status: 'ok',
                        id: 'mock-' + Date.now(),
                        message: 'Mock notification sent successfully'
                    }
                };
            }

            const message = {
                to: token,
                title,
                body,
                data,
                sound: 'default',
                priority: 'high',
                channelId: 'default'
            };

            console.log('📤 Enviando para API Expo:', token.substring(0, 30) + '...');

            const response = await axios.post(this.expoPushUrl, message, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                }
            });

            // Log detalhado da resposta
            console.log('📊 Resposta da API Expo:', JSON.stringify(response.data, null, 2));

            // Verificar se o token é inválido
            if (response.data) {
                // A API do Expo retorna: response.data.data.status = 'error'
                if (response.data.data && response.data.data.status === 'error' && response.data.data.details && response.data.data.details.error === 'DeviceNotRegistered') {
                    console.log(`🗑️ Token inválido detectado: ${token}`);
                    console.log(`📋 Detalhes do erro:`, response.data.data.details);
                    await this.removeInvalidToken(token);
                    return { success: false, error: 'DeviceNotRegistered', tokenRemoved: true };
                }
            }

            console.log('✅ Notificação enviada com sucesso para token:', token);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ Erro ao enviar notificação:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Enviar notificação para todos os dispositivos
    async sendNotificationToAllDevices(title, body, data = {}) {
        try {
            const { data: tokens, error } = await supabase
                .from('device_tokens')
                .select('token, user_id, device_info')
                .eq('is_active', true);

            if (error) {
                console.error('❌ Erro ao buscar tokens:', error);
                return { success: false, error: error.message };
            }

            if (!tokens || tokens.length === 0) {
                console.log('⚠️ Nenhum token encontrado');
                return { success: true, sent: 0 };
            }

            console.log(`📱 Tokens encontrados no banco: ${tokens.length}`);
            tokens.forEach((tokenData, index) => {
                console.log(`   ${index + 1}. Token: ${tokenData.token}`);
                console.log(`      User ID: ${tokenData.user_id}`);
                console.log(`      Device Info: ${JSON.stringify(tokenData.device_info)}`);
            });

            const results = [];
            let validTokensCount = 0;
            let invalidTokensRemoved = 0;

            for (const tokenData of tokens) {
                console.log(`\n🔄 Processando token: ${tokenData.token}`);
                const result = await this.sendPushNotification(
                    tokenData.token,
                    title,
                    body,
                    { ...data, userId: tokenData.user_id }
                );

                results.push(result);

                if (result.success) {
                    validTokensCount++;
                } else if (result.tokenRemoved) {
                    invalidTokensRemoved++;
                }
            }

            console.log(`📊 Relatório de envio:`);
            console.log(`   ✅ Tokens válidos que receberam: ${validTokensCount}`);
            console.log(`   🗑️ Tokens inválidos removidos: ${invalidTokensRemoved}`);
            console.log(`   📱 Total processado: ${tokens.length}`);

            return {
                success: true,
                sent: validTokensCount,
                total: tokens.length,
                invalidTokensRemoved,
                results
            };
        } catch (error) {
            console.error('❌ Erro ao enviar notificações:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar notificação para usuário específico
    async sendNotificationToUser(userId, title, body, data = {}) {
        try {
            const { data: tokens, error } = await supabase
                .from('device_tokens')
                .select('token, device_info')
                .eq('user_id', userId)
                .eq('is_active', true);

            if (error) {
                console.error('❌ Erro ao buscar tokens do usuário:', error);
                return { success: false, error: error.message };
            }

            if (!tokens || tokens.length === 0) {
                console.log(`⚠️ Nenhum token encontrado para o usuário ${userId}`);
                return { success: true, sent: 0 };
            }

            const results = [];
            for (const tokenData of tokens) {
                const result = await this.sendPushNotification(
                    tokenData.token,
                    title,
                    body,
                    { ...data, userId }
                );
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ Notificações enviadas para usuário ${userId}: ${successCount}/${tokens.length}`);

            return {
                success: true,
                sent: successCount,
                total: tokens.length,
                results
            };
        } catch (error) {
            console.error('❌ Erro ao enviar notificação para usuário:', error);
            return { success: false, error: error.message };
        }
    }

    // Remover token inválido do banco
    async removeInvalidToken(token) {
        try {
            // Primeiro, verificar se o token existe no banco
            const { data: existingToken, error: fetchError } = await supabase
                .from('device_tokens')
                .select('*')
                .eq('token', token)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('❌ Erro ao buscar token no banco:', fetchError);
                return { success: false, error: fetchError.message };
            }

            if (existingToken) {
                console.log(`🔍 Token encontrado no banco:`, {
                    id: existingToken.id,
                    user_id: existingToken.user_id,
                    device_info: existingToken.device_info,
                    is_active: existingToken.is_active,
                    created_at: existingToken.created_at,
                    updated_at: existingToken.updated_at
                });
            } else {
                console.log(`⚠️ Token não encontrado no banco: ${token}`);
                return { success: true, message: 'Token não encontrado no banco' };
            }

            // Remover o token
            const { error } = await supabase
                .from('device_tokens')
                .delete()
                .eq('token', token);

            if (error) {
                console.error('❌ Erro ao remover token inválido:', error);
                return { success: false, error: error.message };
            }

            console.log(`🗑️ Token inválido removido do banco: ${token}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao remover token inválido:', error);
            return { success: false, error: error.message };
        }
    }

    // Buscar dados mínimos do anúncio
    async fetchPropertyMinimal(propertyId) {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('id, user_id, title, city')
                .eq('id', propertyId)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar propriedade:', error);
                return null;
            }
            return data;
        } catch (error) {
            console.error('❌ Erro inesperado ao buscar propriedade:', error);
            return null;
        }
    }

    // Enviar notificação padronizada de anúncio aprovado (com objeto property)
    async sendPropertyApproved(userId, property) {
        const title = '🏡 Anúncio aprovado! 🎉';
        const body = `Seu anúncio "${property?.title || 'Imóvel'}" foi aprovado e já está no ar.`;
        const data = { type: 'property_approved', propertyId: property?.id };
        return this.sendNotificationToUser(userId, title, body, data);
    }

    // Enviar notificação padronizada de anúncio aprovado (via propertyId)
    async sendPropertyApprovedById(userId, propertyId) {
        const property = await this.fetchPropertyMinimal(propertyId);
        if (!property) {
            return { success: false, error: 'Propriedade não encontrada' };
        }
        return this.sendPropertyApproved(userId, property);
    }
}

export default NotificationService;
