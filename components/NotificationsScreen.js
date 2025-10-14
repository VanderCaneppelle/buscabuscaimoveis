/**
 * =====================================================
 * TELA DE NOTIFICAÇÕES IN-APP
 * =====================================================
 * Tela completa para visualizar e gerenciar notificações
 * =====================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { InAppNotificationAPI, NotificationUtils } from '../lib/inAppNotificationService';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase'; // ✨ NOVO - Para Realtime

export default function NotificationsScreen({ navigation }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // ✨ Flag para evitar múltiplos loads

    // Carregar notificações apenas na primeira montagem
    useEffect(() => {
        if (!hasLoadedOnce && user?.id) {
            console.log('📱 Primeira carga de notificações');
            loadNotifications();
            setHasLoadedOnce(true);
        }
    }, [user?.id, hasLoadedOnce]);

    // Recarregar APENAS quando a tela ganhar foco VINDO DE OUTRA TAB
    // (não recarrega quando volta da navegação interna)
    useFocusEffect(
        useCallback(() => {
            // Não recarregar na primeira vez (já carregou no useEffect acima)
            // Apenas recarregar quando voltar para a tela depois de ter saído
            if (hasLoadedOnce && notifications.length > 0) {
                console.log('📱 Tela ganhou foco - SKIP reload (Realtime atualiza automaticamente)');
                // Não recarrega - deixa o Realtime fazer o trabalho
                // Só recarrega no pull-to-refresh manual
            }
        }, [hasLoadedOnce, notifications.length])
    );

    // ✨ NOVO: Atualizar com Realtime (instantâneo!)
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔴 NotificationsScreen: Configurando Realtime para userId:', user.id.substring(0, 8));

        // Inscrever para mudanças nas notificações do usuário atual
        const channel = supabase
            .channel('notifications-list-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'in_app_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🔔 Nova notificação recebida via Realtime!', payload.new);
                    // Adicionar no topo da lista
                    setNotifications(prev => [payload.new, ...prev]);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'in_app_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🔄 Notificação atualizada via Realtime!', payload.new);
                    // Atualizar na lista
                    setNotifications(prev =>
                        prev.map(n => n.id === payload.new.id ? payload.new : n)
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'in_app_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🗑️ Notificação deletada via Realtime!', payload.old);
                    // Remover da lista
                    setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
                }
            )
            .subscribe((status) => {
                console.log('📡 Status da subscrição Realtime (lista):', status);
            });

        // Cleanup ao desmontar
        return () => {
            console.log('🔴 NotificationsScreen: Desconectando Realtime');
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const loadNotifications = async () => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const data = await InAppNotificationAPI.getNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error('Erro ao carregar notificações:', error);
            Alert.alert('Erro', 'Não foi possível carregar as notificações');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleMarkAsRead = async (notification) => {
        if (notification.read) return;

        const success = await InAppNotificationAPI.markAsRead(notification.id);
        
        if (success) {
            // Atualizar localmente
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
            );
        }
    };

    const handleMarkAsUnread = async (notification) => {
        if (!notification.read) return;

        const success = await InAppNotificationAPI.markAsUnread(notification.id);
        
        if (success) {
            // Atualizar localmente
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, read: false } : n)
            );
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadCount = notifications.filter(n => !n.read).length;
        
        if (unreadCount === 0) {
            Alert.alert('Aviso', 'Não há notificações não lidas');
            return;
        }

        Alert.alert(
            'Marcar todas como lidas',
            `Deseja marcar ${unreadCount} notificação(s) como lida(s)?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        const success = await InAppNotificationAPI.markAllAsRead(user.id);
                        if (success) {
                            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteNotification = async (notificationId) => {
        Alert.alert(
            'Excluir notificação',
            'Deseja excluir esta notificação?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await InAppNotificationAPI.deleteNotification(notificationId);
                        if (success) {
                            setNotifications(prev => prev.filter(n => n.id !== notificationId));
                        }
                    }
                }
            ]
        );
    };

    const handleNotificationPress = async (notification) => {
        // Marcar como lida
        await handleMarkAsRead(notification);

        // Navegar baseado no tipo
        try {
            console.log('🧭 Navegando para:', notification.type);
            
            switch (notification.type) {
                case 'property_approved':
                case 'property_rejected':
                    // Navegar para "Meus Anúncios" no AdvertiseStack
                    // Primeiro voltar para Home, depois navegar para a tab
                    navigation.goBack(); // Fecha a tela de notificações
                    setTimeout(() => {
                        const rootNav = navigation.getParent();
                        console.log('🧭 Root navigation:', rootNav ? 'encontrado' : 'não encontrado');
                        if (rootNav) {
                            rootNav.navigate('Anuncie', {
                                screen: 'MyProperties'
                            });
                        }
                    }, 300); // Pequeno delay para garantir que voltou
                    break;

                case 'plan_expiring':
                    // Navegar para "Planos" (modal no nível raiz)
                    navigation.goBack(); // Fecha notificações
                    setTimeout(() => {
                        navigation.navigate('Plans');
                    }, 300);
                    break;

                case 'whatsapp_contact':
                    // Para admins: não navega (é só informativo)
                    // Para donos: navegar para MyProperties
                    if (!notification.data?.is_admin_notification) {
                        navigation.goBack();
                        setTimeout(() => {
                            const rootNav = navigation.getParent();
                            if (rootNav) {
                                rootNav.navigate('Anuncie', {
                                    screen: 'MyProperties'
                                });
                            }
                        }, 300);
                    }
                    break;

                default:
                    // Não navega para nenhum lugar
                    console.log('⚠️ Tipo de notificação não reconhecido:', notification.type);
                    break;
            }
        } catch (error) {
            console.error('❌ Erro ao navegar:', error);
            Alert.alert('Erro', 'Não foi possível navegar para a tela solicitada');
        }
    };

    const renderNotification = ({ item }) => {
        const icon = NotificationUtils.getIconForType(item.type);
        const timeAgo = NotificationUtils.formatRelativeTime(item.created_at);

        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => handleDeleteNotification(item.id)}
                activeOpacity={0.7}
            >
                {/* Ícone */}
                <View style={[styles.iconContainer, { backgroundColor: icon.color + '20' }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                </View>

                {/* Conteúdo */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.title}>{item.title}</Text>
                        {!item.read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={3}>
                        {item.message}
                    </Text>
                    <Text style={styles.time}>{timeAgo}</Text>
                </View>

                {/* Botão de ação */}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        if (item.read) {
                            handleMarkAsUnread(item);
                        } else {
                            handleMarkAsRead(item);
                        }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons 
                        name={item.read ? "mail-unread-outline" : "checkmark-circle-outline"} 
                        size={22} 
                        color="#6b7280" 
                    />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyText}>Nenhuma notificação</Text>
            <Text style={styles.emptySubtext}>
                Você receberá notificações sobre seus anúncios, planos e contatos
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color="#00335e" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notificações</Text>
                </View>
                {notifications.some(n => !n.read) && (
                    <TouchableOpacity 
                        onPress={handleMarkAllAsRead}
                        style={styles.markAllButton}
                    >
                        <Text style={styles.markAllButtonText}>
                            Marcar todas como lidas
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Lista de Notificações */}
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={!loading && renderEmptyState()}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    markAllButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f0f9ff',
    },
    markAllButtonText: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '600',
    },
    listContainer: {
        paddingVertical: 8,
        paddingBottom: 20,
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginVertical: 6,
        padding: 14,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    unreadCard: {
        backgroundColor: '#f0f9ff',
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1f2937',
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        marginLeft: 8,
    },
    message: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
        marginBottom: 6,
    },
    time: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    actionButton: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6b7280',
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 20,
    },
});

