import { supabase } from './supabase.js';
import axios from 'axios';

export class NotificationService {
    constructor() {
        this.expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    }

    // Registrar token do dispositivo
    async registerDeviceToken(token, userId, platform) {
        try {
            const { data, error } = await supabase
                .from('device_tokens')
                .upsert({
                    token,
                    user_id: userId,
                    platform,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'token'
                });

            if (error) {
                console.error('❌ Erro ao registrar token:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Token registrado com sucesso');
            return { success: true, data };
        } catch (error) {
            console.error('❌ Erro ao registrar token:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar notificação push
    async sendPushNotification(token, title, body, data = {}) {
        try {
            const message = {
                to: token,
                title,
                body,
                data,
                sound: 'default',
                priority: 'high',
                channelId: 'default'
            };

            const response = await axios.post(this.expoPushUrl, message, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                }
            });

            // Verificar se o token é inválido
            if (response.data && response.data.data) {
                const receipt = response.data.data[0];
                if (receipt && receipt.status === 'error' && receipt.details && receipt.details.error === 'DeviceNotRegistered') {
                    console.log(`🗑️ Token inválido detectado: ${token.substring(0, 20)}...`);
                    await this.removeInvalidToken(token);
                    return { success: false, error: 'DeviceNotRegistered', tokenRemoved: true };
                }
            }

            console.log('✅ Notificação enviada:', response.data);
            return { success: true, data: response.data };
        } catch (error) {
            console.error('❌ Erro ao enviar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    // Enviar notificação para todos os dispositivos
    async sendNotificationToAllDevices(title, body, data = {}) {
        try {
            const { data: tokens, error } = await supabase
                .from('device_tokens')
                .select('token, user_id, platform');

            if (error) {
                console.error('❌ Erro ao buscar tokens:', error);
                return { success: false, error: error.message };
            }

            if (!tokens || tokens.length === 0) {
                console.log('⚠️ Nenhum token encontrado');
                return { success: true, sent: 0 };
            }

            const results = [];
            let validTokensCount = 0;
            let invalidTokensRemoved = 0;

            for (const tokenData of tokens) {
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

            const successCount = results.filter(r => r.success).length;
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
                .select('token, platform')
                .eq('user_id', userId);

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
            const { error } = await supabase
                .from('device_tokens')
                .delete()
                .eq('token', token);

            if (error) {
                console.error('❌ Erro ao remover token inválido:', error);
                return { success: false, error: error.message };
            }

            console.log(`🗑️ Token inválido removido do banco: ${token.substring(0, 20)}...`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao remover token inválido:', error);
            return { success: false, error: error.message };
        }
    }

    // Limpar todos os tokens inválidos (função de manutenção)
    async cleanupAllInvalidTokens() {
        try {
            console.log('🧹 Iniciando limpeza de todos os tokens...');
            
            const { data: tokens, error } = await supabase
                .from('device_tokens')
                .select('token');

            if (error) {
                console.error('❌ Erro ao buscar tokens para limpeza:', error);
                return { success: false, error: error.message };
            }

            if (!tokens || tokens.length === 0) {
                console.log('✅ Nenhum token encontrado para limpeza');
                return { success: true, removed: 0 };
            }

            let removedCount = 0;
            for (const tokenData of tokens) {
                // Enviar uma notificação de teste para verificar se o token é válido
                const testResult = await this.sendPushNotification(
                    tokenData.token,
                    'Teste de Token',
                    'Verificando se o token é válido...',
                    { type: 'token_validation' }
                );

                if (testResult.tokenRemoved) {
                    removedCount++;
                }
            }

            console.log(`🧹 Limpeza concluída: ${removedCount} tokens inválidos removidos`);
            return { success: true, removed: removedCount };
        } catch (error) {
            console.error('❌ Erro na limpeza de tokens:', error);
            return { success: false, error: error.message };
        }
    }
}

export default NotificationService;
