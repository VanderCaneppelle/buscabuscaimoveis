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
}; 