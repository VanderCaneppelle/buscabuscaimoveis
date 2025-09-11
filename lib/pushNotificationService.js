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

    // Obter token do dispositivo
    getExpoPushToken: async () => {
        try {
            // Verificar se estamos em um dispositivo real
            if (Platform.OS === 'web') {
                console.log('⚠️ Push notifications não suportadas na web');
                return null;
            }

            // Obter token real do Expo
            const token = await Notifications.getExpoPushTokenAsync({
                projectId: '3d62b9b3-f6a9-47db-93db-666f037084e3'
            });

            console.log('📱 Token de notificação real:', token.data);
            return token.data;
        } catch (error) {
            console.error('❌ Erro ao obter token:', error);

            // Fallback para token mock em desenvolvimento
            const mockToken = `ExponentPushToken[${Math.random().toString(36).substr(2, 9)}]`;
            console.log('📱 Usando token mock:', mockToken);
            return mockToken;
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

            // Mensagens para diferentes horários (teste - 5 minutos a partir de agora)
            const now = new Date();
            const testTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos a partir de agora
            
            const notifications = [
                {
                    id: 'test_reminder_1',
                    title: '🧪 Teste 1 - 5 min',
                    body: 'Primeira notificação de teste!',
                    hour: testTime.getHours(),
                    minute: testTime.getMinutes()
                },
                {
                    id: 'test_reminder_2',
                    title: '🧪 Teste 2 - 6 min',
                    body: 'Segunda notificação de teste!',
                    hour: testTime.getHours(),
                    minute: testTime.getMinutes() + 1
                },
                {
                    id: 'test_reminder_3',
                    title: '🧪 Teste 3 - 7 min',
                    body: 'Terceira notificação de teste!',
                    hour: testTime.getHours(),
                    minute: testTime.getMinutes() + 2
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
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://buscabusca.vercel.app';
            const url = `${apiUrl}/api/notifications?action=register`;

            console.log('🔄 Registrando token no backend:', url);
            console.log('📱 Token:', token);
            console.log('👤 User ID:', userId);

            const response = await fetch(url, {
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

            console.log('📊 Response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Token registrado no backend:', result);
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ Erro ao registrar token:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao registrar token:', error.message);
            return false;
        }
    },

    // Enviar notificação via backend
    sendNotificationViaBackend: async (title, body, data = {}, userId = null, sendToAll = false) => {
        try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://buscabusca.vercel.app';
            const response = await fetch(`${apiUrl}/api/notifications?action=send`, {
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
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://buscabusca.vercel.app';
            const response = await fetch(`${apiUrl}/api/notifications?action=schedule`, {
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