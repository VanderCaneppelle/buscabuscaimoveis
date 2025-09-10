import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar notificações
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const PushNotificationService = {
    // Solicitar permissões
    requestPermissions: async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('❌ Permissão de notificação não concedida');
            return false;
        }

        console.log('✅ Permissão de notificação concedida');
        return true;
    },

    // Obter token do dispositivo (apenas para desenvolvimento)
    getExpoPushToken: async () => {
        try {
            // No desenvolvimento, vamos simular um token
            // Em produção, isso seria um token real do Expo
            const mockToken = `ExponentPushToken[${Math.random().toString(36).substr(2, 9)}]`;
            console.log('📱 Token de notificação (mock):', mockToken);
            return mockToken;
        } catch (error) {
            console.error('❌ Erro ao obter token:', error);
            return null;
        }
    },

    // Enviar notificação local
    sendLocalNotification: async (title, body, data = {}) => {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                },
                trigger: null, // Enviar imediatamente
            });
            console.log('✅ Notificação local enviada');
        } catch (error) {
            console.error('❌ Erro ao enviar notificação local:', error);
        }
    },

    // Configurar listener para notificações recebidas
    setupNotificationListener: (callback) => {
        const subscription = Notifications.addNotificationReceivedListener(callback);
        return subscription;
    },

    // Configurar listener para notificações respondidas
    setupNotificationResponseListener: (callback) => {
        const subscription = Notifications.addNotificationResponseReceivedListener(callback);
        return subscription;
    },

    // Agendar notificações diárias
    scheduleDailyNotifications: async () => {
        try {
            // Cancelar notificações anteriores para evitar duplicatas
            await Notifications.cancelAllScheduledNotificationsAsync();

            // Mensagens para diferentes horários
            const notifications = [
                {
                    id: 'morning_reminder',
                    title: '🌅 Bom dia!',
                    body: 'Que tal conferir as novidades no BuscaBusca Imóveis?',
                    hour: 9,
                    minute: 0
                },
                {
                    id: 'afternoon_reminder',
                    title: '☀️ Boa tarde!',
                    body: 'Novos imóveis podem ter chegado! Dê uma olhada no app.',
                    hour: 15,
                    minute: 0
                },
                {
                    id: 'evening_reminder',
                    title: '🌙 Boa noite!',
                    body: 'Não esqueça de conferir o BuscaBusca Imóveis antes de dormir!',
                    hour: 21,
                    minute: 0
                }
            ];

            for (const notification of notifications) {
                await Notifications.scheduleNotificationAsync({
                    identifier: notification.id,
                    content: {
                        title: notification.title,
                        body: notification.body,
                        sound: true,
                        data: {
                            type: 'daily_reminder',
                            scheduledTime: `${notification.hour}:${notification.minute.toString().padStart(2, '0')}`
                        }
                    },
                    trigger: {
                        hour: notification.hour,
                        minute: notification.minute,
                        repeats: true
                    }
                });
            }

            console.log('✅ Notificações diárias agendadas com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao agendar notificações:', error);
            return false;
        }
    },

    // Cancelar todas as notificações agendadas
    cancelScheduledNotifications: async () => {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log('✅ Todas as notificações agendadas foram canceladas');
            return true;
        } catch (error) {
            console.error('❌ Erro ao cancelar notificações:', error);
            return false;
        }
    },

    // Verificar notificações agendadas
    getScheduledNotifications: async () => {
        try {
            const scheduled = await Notifications.getAllScheduledNotificationsAsync();
            console.log('📅 Notificações agendadas:', scheduled.length);
            return scheduled;
        } catch (error) {
            console.error('❌ Erro ao obter notificações agendadas:', error);
            return [];
        }
    },

    // Registrar token do dispositivo no backend
    registerDeviceToken: async (token, userId) => {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    userId,
                    platform: Platform.OS
                })
            });

            if (response.ok) {
                console.log('✅ Token registrado no backend');
                return true;
            } else {
                console.error('❌ Erro ao registrar token:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao registrar token:', error);
            return false;
        }
    },

    // Enviar notificação via backend
    sendNotificationViaBackend: async (title, body, data = {}, userId = null, sendToAll = false) => {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications?action=send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    body,
                    data,
                    userId,
                    sendToAll
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Notificação enviada via backend:', result);
                return result;
            } else {
                console.error('❌ Erro ao enviar notificação:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao enviar notificação:', error);
            return false;
        }
    },

    // Enviar notificações agendadas via backend
    sendScheduledNotifications: async () => {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/notifications?action=schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Notificações agendadas enviadas:', result);
                return result;
            } else {
                console.error('❌ Erro ao enviar notificações agendadas:', response.statusText);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao enviar notificações agendadas:', error);
            return false;
        }
    }
}; 