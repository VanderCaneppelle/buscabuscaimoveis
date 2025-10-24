/**
 * =====================================================
 * SERVIÇO DE NOTIFICAÇÕES IN-APP (FRONTEND)
 * =====================================================
 * Cliente para consumir a API de notificações in-app
 * =====================================================
 */

import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://buscabuscaimoveis-qa.vercel.app';

// 🔍 DEBUG: Verificar se a API_URL está sendo carregada
console.log('🔍 [IN-APP-NOTIFICATIONS] API_URL:', API_URL);

export const InAppNotificationAPI = {
    /**
     * Buscar notificações de um usuário
     * @param {string} userId - ID do usuário
     * @param {boolean} unreadOnly - Se deve retornar apenas não lidas
     * @param {number} limit - Limite de resultados
     * @returns {Promise<Array>} - Lista de notificações
     */
    async getNotifications(userId, unreadOnly = false, limit = 50) {
        try {
            console.log(`📥 Buscando notificações... (unreadOnly: ${unreadOnly})`);
            
            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=get&userId=${userId}&unreadOnly=${unreadOnly}&limit=${limit}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao buscar notificações: ${response.status}`);
                return [];
            }

            const result = await response.json();
            console.log(`✅ ${result.count || 0} notificações encontradas`);
            return result.data || [];

        } catch (error) {
            console.error('❌ Erro ao buscar notificações:', error);
            return [];
        }
    },

    /**
     * Marcar notificação como lida
     * @param {string} notificationId - ID da notificação
     * @returns {Promise<boolean>} - Sucesso ou falha
     */
    async markAsRead(notificationId) {
        try {
            console.log(`✓ Marcando notificação ${notificationId.substring(0, 8)}... como lida`);

            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=mark-read`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notificationId })
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao marcar como lida: ${response.status}`);
                return false;
            }

            console.log('✅ Notificação marcada como lida');
            return true;

        } catch (error) {
            console.error('❌ Erro ao marcar como lida:', error);
            return false;
        }
    },

    /**
     * Marcar notificação como não lida
     * @param {string} notificationId - ID da notificação
     * @returns {Promise<boolean>} - Sucesso ou falha
     */
    async markAsUnread(notificationId) {
        try {
            console.log(`✓ Marcando notificação ${notificationId.substring(0, 8)}... como não lida`);

            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=mark-unread`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notificationId })
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao marcar como não lida: ${response.status}`);
                return false;
            }

            console.log('✅ Notificação marcada como não lida');
            return true;

        } catch (error) {
            console.error('❌ Erro ao marcar como não lida:', error);
            return false;
        }
    },

    /**
     * Marcar todas as notificações como lidas
     * @param {string} userId - ID do usuário
     * @returns {Promise<boolean>} - Sucesso ou falha
     */
    async markAllAsRead(userId) {
        try {
            console.log('✓ Marcando todas as notificações como lidas...');

            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=mark-all-read`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId })
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao marcar todas como lidas: ${response.status}`);
                return false;
            }

            const result = await response.json();
            console.log(`✅ ${result.count || 0} notificações marcadas como lidas`);
            return true;

        } catch (error) {
            console.error('❌ Erro ao marcar todas como lidas:', error);
            return false;
        }
    },

    /**
     * Contar notificações não lidas
     * @param {string} userId - ID do usuário
     * @returns {Promise<number>} - Quantidade de não lidas
     */
    async getUnreadCount(userId) {
        try {
            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=count-unread&userId=${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao contar não lidas: ${response.status}`);
                return 0;
            }

            const result = await response.json();
            return result.count || 0;

        } catch (error) {
            console.error('❌ Erro ao contar não lidas:', error);
            return 0;
        }
    },

    /**
     * Deletar uma notificação
     * @param {string} notificationId - ID da notificação
     * @returns {Promise<boolean>} - Sucesso ou falha
     */
    async deleteNotification(notificationId) {
        try {
            console.log(`🗑️ Deletando notificação ${notificationId.substring(0, 8)}...`);

            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=delete`,
                {
                    method: 'POST', // Usando POST para compatibilidade
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notificationId })
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao deletar notificação: ${response.status}`);
                return false;
            }

            console.log('✅ Notificação deletada');
            return true;

        } catch (error) {
            console.error('❌ Erro ao deletar notificação:', error);
            return false;
        }
    },

    /**
     * Criar uma notificação (geralmente usado internamente pelo sistema)
     * @param {Object} params - Parâmetros da notificação
     * @returns {Promise<Object|null>} - Notificação criada ou null
     */
    async createNotification({ userId, type, title, message, data = {} }) {
        try {
            console.log(`📱 Criando notificação in-app: ${title}`);

            const response = await fetch(
                `${API_URL}/api/in-app-notifications?action=create`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        type,
                        title,
                        message,
                        data
                    })
                }
            );

            if (!response.ok) {
                console.error(`❌ Erro ao criar notificação: ${response.status}`);
                return null;
            }

            const result = await response.json();
            console.log('✅ Notificação criada com sucesso');
            return result.data;

        } catch (error) {
            console.error('❌ Erro ao criar notificação:', error);
            return null;
        }
    }
};

/**
 * Utilitários para formatar dados de notificações
 */
export const NotificationUtils = {
    /**
     * Formatar tempo relativo (ex: "2h atrás", "3d atrás")
     * @param {string} dateString - Data em formato ISO
     * @returns {string} - Tempo formatado
     */
    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const weeks = Math.floor(days / 7);
        const months = Math.floor(days / 30);

        if (seconds < 60) return 'Agora';
        if (minutes < 60) return `${minutes}m atrás`;
        if (hours < 24) return `${hours}h atrás`;
        if (days < 7) return `${days}d atrás`;
        if (weeks < 4) return `${weeks}sem atrás`;
        if (months < 12) return `${months}m atrás`;
        
        return date.toLocaleDateString('pt-BR');
    },

    /**
     * Obter ícone baseado no tipo de notificação
     * @param {string} type - Tipo da notificação
     * @returns {Object} - { name: string, color: string }
     */
    getIconForType(type) {
        const icons = {
            property_approved: { name: 'checkmark-circle', color: '#10b981' },
            property_rejected: { name: 'close-circle', color: '#ef4444' },
            plan_expiring: { name: 'warning', color: '#f59e0b' },
            whatsapp_contact: { name: 'logo-whatsapp', color: '#25d366' },
        };

        return icons[type] || { name: 'notifications', color: '#6b7280' };
    },

    /**
     * Obter título amigável para o tipo
     * @param {string} type - Tipo da notificação
     * @returns {string} - Título amigável
     */
    getFriendlyTypeName(type) {
        const names = {
            property_approved: 'Anúncio Aprovado',
            property_rejected: 'Anúncio Rejeitado',
            plan_expiring: 'Plano Expirando',
            whatsapp_contact: 'Novo Contato',
        };

        return names[type] || 'Notificação';
    }
};

