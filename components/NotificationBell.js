/**
 * =====================================================
 * COMPONENTE SININHO DE NOTIFICAÇÕES
 * =====================================================
 * Ícone de notificação com badge que aparece no header
 * =====================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { InAppNotificationAPI } from '../lib/inAppNotificationService';
import { useFocusEffect } from '@react-navigation/native';

export default function NotificationBell({ navigation }) {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Carregar contagem ao montar
    useEffect(() => {
        if (user?.id) {
            loadUnreadCount();
        }
    }, [user?.id]);

    // Recarregar quando a tela ganhar foco
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                loadUnreadCount();
            }
        }, [user?.id])
    );

    // Atualizar periodicamente (a cada 30 segundos)
    useEffect(() => {
        if (!user?.id) return;

        const interval = setInterval(() => {
            loadUnreadCount();
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [user?.id]);

    const loadUnreadCount = async () => {
        if (!user?.id || loading) return;
        
        setLoading(true);
        try {
            const count = await InAppNotificationAPI.getUnreadCount(user.id);
            setUnreadCount(count);
        } catch (error) {
            console.error('Erro ao carregar contagem de notificações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePress = () => {
        if (navigation) {
            navigation.navigate('Notifications');
        }
    };

    // Não renderizar se não houver usuário
    if (!user?.id) {
        return null;
    }

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Ionicons 
                name={unreadCount > 0 ? "notifications" : "notifications-outline"} 
                size={24} 
                color="#00335e" 
            />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        marginRight: 15,
        position: 'relative',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

