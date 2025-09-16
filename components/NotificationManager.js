import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { PushNotificationService } from '../lib/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';

export default function NotificationManager() {
    const { user } = useAuth();
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);
    const appState = useRef(AppState.currentState);

    useEffect(() => {
        initializeNotifications();
        // Não registrar token automaticamente ao entrar nesta tela
        // e nem quando o app volta do background. O registro agora ocorre no login.
        const noop = () => { };
        const subscription = AppState.addEventListener('change', noop);
        return () => subscription?.remove();
    }, [user]);

    const initializeNotifications = async () => {
        if (!user) return;

        try {
            // Solicitar permissões
            const hasPermission = await PushNotificationService.requestPermissions();

            if (hasPermission) {
                // Apenas consultar notificações agendadas; não registrar token aqui
                const scheduledNotifications = await PushNotificationService.getScheduledNotifications();
                setScheduledCount(scheduledNotifications.length);
                if (scheduledNotifications.length > 0) {
                    setNotificationsEnabled(true);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar notificações:', error);
        }
    };

    // Removido: registro automático ao voltar do background

    const toggleNotifications = async () => {
        try {
            if (notificationsEnabled) {
                // Desabilitar notificações
                await PushNotificationService.cancelScheduledNotifications();
                setNotificationsEnabled(false);
                setScheduledCount(0);
                Alert.alert('Sucesso', 'Notificações desabilitadas');
            } else {
                // Habilitar notificações
                const scheduled = await PushNotificationService.scheduleDailyNotifications();

                if (scheduled) {
                    setNotificationsEnabled(true);
                    const scheduledNotifications = await PushNotificationService.getScheduledNotifications();
                    setScheduledCount(scheduledNotifications.length);
                    Alert.alert('Sucesso', 'Notificações habilitadas! Você receberá lembretes às 9h, 15h e 21h.');
                } else {
                    Alert.alert('Erro', 'Não foi possível habilitar as notificações');
                }
            }
        } catch (error) {
            console.error('❌ Erro ao alternar notificações:', error);
            Alert.alert('Erro', 'Ocorreu um erro ao alterar as configurações de notificação');
        }
    };

    const testNotification = async () => {
        try {
            // Registrar token antes do teste
            console.log('🔄 Registrando token antes do teste...');
            const token = await PushNotificationService.registerTokenAutomatically(user.id);

            if (token) {
                console.log('✅ Token registrado:', token.substring(0, 30) + '...');
            } else {
                console.error('❌ Falha ao registrar token');
            }

            // Testar notificação local
            await PushNotificationService.sendLocalNotification(
                '🧪 Teste Local',
                'Esta é uma notificação local de teste!',
                { type: 'test_local' }
            );

            // Testar notificação via backend
            const backendResult = await PushNotificationService.sendNotificationViaBackend(
                '🧪 Teste Backend',
                'Esta é uma notificação de teste via backend!',
                { type: 'test_backend' },
                user?.id,
                false
            );

            if (backendResult) {
                Alert.alert('Sucesso', 'Notificações de teste enviadas! (Local + Backend)\n\n✅ Novo token válido registrado!');
            } else {
                Alert.alert('Sucesso', 'Notificação local enviada! (Backend falhou)\n\n✅ Novo token válido registrado!');
            }
        } catch (error) {
            console.error('❌ Erro ao enviar notificação de teste:', error);
            Alert.alert('Erro', 'Não foi possível enviar a notificação de teste');
        }
    };

    const testScheduledNotifications = async () => {
        try {
            const result = await PushNotificationService.sendScheduledNotifications();
            if (result) {
                Alert.alert('Sucesso', `Notificações agendadas enviadas! Enviado para ${result.totalSent} dispositivos.`);
            } else {
                Alert.alert('Erro', 'Não foi possível enviar as notificações agendadas');
            }
        } catch (error) {
            console.error('❌ Erro ao enviar notificações agendadas:', error);
            Alert.alert('Erro', 'Não foi possível enviar as notificações agendadas');
        }
    };

    if (!user) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notificações</Text>

            <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                    Status: {notificationsEnabled ? '✅ Ativadas' : '❌ Desativadas'}
                </Text>
                {scheduledCount > 0 && (
                    <Text style={styles.countText}>
                        {scheduledCount} notificação(ões) agendada(s)
                    </Text>
                )}
            </View>

            <View style={styles.scheduleInfo}>
                <Text style={styles.scheduleTitle}>Horários das notificações:</Text>
                <Text style={styles.scheduleText}>🌅 09:00 - Bom dia!</Text>
                <Text style={styles.scheduleText}>☀️ 15:00 - Boa tarde!</Text>
                <Text style={styles.scheduleText}>🌙 21:00 - Boa noite!</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        notificationsEnabled ? styles.disableButton : styles.enableButton
                    ]}
                    onPress={toggleNotifications}
                >
                    <Text style={styles.buttonText}>
                        {notificationsEnabled ? 'Desabilitar Notificações' : 'Habilitar Notificações'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.testButton}
                    onPress={testNotification}
                >
                    <Text style={styles.buttonText}>Testar Notificação</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.testButton, { backgroundColor: '#FF9800' }]}
                    onPress={testScheduledNotifications}
                >
                    <Text style={styles.buttonText}>Testar Agendadas</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        margin: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    statusContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    countText: {
        fontSize: 14,
        color: '#666',
    },
    scheduleInfo: {
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#e8f4fd',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    scheduleTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#1976D2',
    },
    scheduleText: {
        fontSize: 14,
        marginBottom: 5,
        color: '#333',
    },
    buttonContainer: {
        gap: 10,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    enableButton: {
        backgroundColor: '#4CAF50',
    },
    disableButton: {
        backgroundColor: '#f44336',
    },
    testButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
