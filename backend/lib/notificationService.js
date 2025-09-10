import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

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
            for (const tokenData of tokens) {
                const result = await this.sendPushNotification(
                    tokenData.token,
                    title,
                    body,
                    { ...data, userId: tokenData.user_id }
                );
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            console.log(`✅ Notificações enviadas: ${successCount}/${tokens.length}`);

            return {
                success: true,
                sent: successCount,
                total: tokens.length,
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

    // Limpar tokens inválidos
    async cleanupInvalidTokens() {
        try {
            // Esta função seria chamada periodicamente para limpar tokens inválidos
            // Por enquanto, apenas log
            console.log('🧹 Limpeza de tokens inválidos executada');
            return { success: true };
        } catch (error) {
            console.error('❌ Erro na limpeza de tokens:', error);
            return { success: false, error: error.message };
        }
    }
}

export default NotificationService;
