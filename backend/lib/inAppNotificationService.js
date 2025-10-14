/**
 * =====================================================
 * SERVIÇO DE NOTIFICAÇÕES IN-APP
 * =====================================================
 * Gerencia criação, leitura e atualização de notificações in-app
 * Separado do sistema de push notifications para manter independência
 * =====================================================
 */

import { supabase } from './supabase.js';

export class InAppNotificationService {
    
    /**
     * Criar uma notificação in-app
     * @param {Object} params - Parâmetros da notificação
     * @param {string} params.userId - ID do usuário que receberá a notificação
     * @param {string} params.type - Tipo da notificação
     * @param {string} params.title - Título da notificação
     * @param {string} params.message - Mensagem da notificação
     * @param {Object} params.data - Dados adicionais (opcional)
     * @returns {Object} - Resultado da operação
     */
    async createNotification({ userId, type, title, message, data = {} }) {
        try {
            console.log(`📱 Criando notificação in-app:`, {
                userId: userId.substring(0, 8) + '...',
                type,
                title
            });

            const { data: notification, error } = await supabase
                .from('in_app_notifications')
                .insert({
                    user_id: userId,
                    type,
                    title,
                    message,
                    data,
                    read: false
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao criar notificação:', error);
                throw error;
            }
            
            console.log(`✅ Notificação in-app criada com sucesso:`, notification.id);
            return { success: true, data: notification };

        } catch (error) {
            console.error('❌ Erro ao criar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Buscar notificações de um usuário
     * @param {string} userId - ID do usuário
     * @param {boolean} unreadOnly - Se deve retornar apenas não lidas
     * @param {number} limit - Limite de resultados (padrão: 50)
     * @returns {Object} - Lista de notificações
     */
    async getUserNotifications(userId, unreadOnly = false, limit = 50) {
        try {
            console.log(`📥 Buscando notificações para usuário ${userId.substring(0, 8)}...`, {
                unreadOnly,
                limit
            });

            let query = supabase
                .from('in_app_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (unreadOnly) {
                query = query.eq('read', false);
            }

            const { data, error } = await query;
            
            if (error) {
                console.error('❌ Erro ao buscar notificações:', error);
                throw error;
            }
            
            console.log(`✅ Encontradas ${data.length} notificações`);
            return { success: true, data, count: data.length };

        } catch (error) {
            console.error('❌ Erro ao buscar notificações:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Marcar notificação como lida
     * @param {string} notificationId - ID da notificação
     * @returns {Object} - Resultado da operação
     */
    async markAsRead(notificationId) {
        try {
            console.log(`✓ Marcando notificação ${notificationId.substring(0, 8)}... como lida`);

            const { error } = await supabase
                .from('in_app_notifications')
                .update({ 
                    read: true, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Erro ao marcar como lida:', error);
                throw error;
            }
            
            console.log(`✅ Notificação marcada como lida`);
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao marcar como lida:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marcar notificação como não lida
     * @param {string} notificationId - ID da notificação
     * @returns {Object} - Resultado da operação
     */
    async markAsUnread(notificationId) {
        try {
            console.log(`✓ Marcando notificação ${notificationId.substring(0, 8)}... como não lida`);

            const { error } = await supabase
                .from('in_app_notifications')
                .update({ 
                    read: false, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Erro ao marcar como não lida:', error);
                throw error;
            }
            
            console.log(`✅ Notificação marcada como não lida`);
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao marcar como não lida:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marcar todas as notificações de um usuário como lidas
     * @param {string} userId - ID do usuário
     * @returns {Object} - Resultado da operação
     */
    async markAllAsRead(userId) {
        try {
            console.log(`✓ Marcando todas as notificações como lidas para ${userId.substring(0, 8)}...`);

            const { error, count } = await supabase
                .from('in_app_notifications')
                .update({ 
                    read: true, 
                    updated_at: new Date().toISOString() 
                })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) {
                console.error('❌ Erro ao marcar todas como lidas:', error);
                throw error;
            }
            
            console.log(`✅ ${count || 0} notificações marcadas como lidas`);
            return { success: true, count };

        } catch (error) {
            console.error('❌ Erro ao marcar todas como lidas:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Contar notificações não lidas
     * @param {string} userId - ID do usuário
     * @returns {Object} - Contagem de não lidas
     */
    async getUnreadCount(userId) {
        try {
            const { count, error } = await supabase
                .from('in_app_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) {
                console.error('❌ Erro ao contar não lidas:', error);
                throw error;
            }
            
            return { success: true, count: count || 0 };

        } catch (error) {
            console.error('❌ Erro ao contar não lidas:', error);
            return { success: false, error: error.message, count: 0 };
        }
    }

    /**
     * Deletar uma notificação
     * @param {string} notificationId - ID da notificação
     * @returns {Object} - Resultado da operação
     */
    async deleteNotification(notificationId) {
        try {
            console.log(`🗑️ Deletando notificação ${notificationId.substring(0, 8)}...`);

            const { error } = await supabase
                .from('in_app_notifications')
                .delete()
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Erro ao deletar notificação:', error);
                throw error;
            }
            
            console.log(`✅ Notificação deletada`);
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao deletar notificação:', error);
            return { success: false, error: error.message };
        }
    }

    // =====================================================
    // MÉTODOS ESPECÍFICOS POR TIPO DE NOTIFICAÇÃO
    // =====================================================

    /**
     * Notificar aprovação de anúncio
     * @param {string} userId - ID do usuário (dono do anúncio)
     * @param {string} propertyId - ID do imóvel
     * @param {string} propertyTitle - Título do imóvel
     * @returns {Object} - Resultado da operação
     */
    async notifyPropertyApproved(userId, propertyId, propertyTitle) {
        console.log(`✅ Notificando aprovação de anúncio: "${propertyTitle}"`);
        
        return this.createNotification({
            userId,
            type: 'property_approved',
            title: '✅ Anúncio Aprovado!',
            message: `Seu anúncio "${propertyTitle}" foi aprovado e agora está visível para todos!`,
            data: { 
                property_id: propertyId,
                property_title: propertyTitle,
                action: 'view_property'
            }
        });
    }

    /**
     * Notificar rejeição de anúncio
     * @param {string} userId - ID do usuário (dono do anúncio)
     * @param {string} propertyId - ID do imóvel
     * @param {string} propertyTitle - Título do imóvel
     * @param {string} reason - Motivo da rejeição (opcional)
     * @returns {Object} - Resultado da operação
     */
    async notifyPropertyRejected(userId, propertyId, propertyTitle, reason = null) {
        console.log(`❌ Notificando rejeição de anúncio: "${propertyTitle}"`);
        
        const message = reason 
            ? `Seu anúncio "${propertyTitle}" foi rejeitado. Motivo: ${reason}`
            : `Seu anúncio "${propertyTitle}" foi rejeitado. Entre em contato para mais informações.`;

        return this.createNotification({
            userId,
            type: 'property_rejected',
            title: '❌ Anúncio Rejeitado',
            message,
            data: { 
                property_id: propertyId,
                property_title: propertyTitle,
                reason: reason || 'Não especificado',
                action: 'view_property'
            }
        });
    }

    /**
     * Notificar plano expirando
     * @param {string} userId - ID do usuário
     * @param {string} planName - Nome do plano
     * @param {number} daysRemaining - Dias restantes
     * @param {string} endDate - Data de expiração (formatada)
     * @returns {Object} - Resultado da operação
     */
    async notifyPlanExpiring(userId, planName, daysRemaining, endDate) {
        console.log(`⚠️ Notificando plano expirando: ${planName} (${daysRemaining} dias)`);
        
        return this.createNotification({
            userId,
            type: 'plan_expiring',
            title: '⚠️ Seu Plano Está Expirando',
            message: `Seu ${planName} expira em ${daysRemaining} dias (${endDate}). Renove agora para manter seus anúncios ativos!`,
            data: { 
                plan_name: planName,
                days_remaining: daysRemaining,
                end_date: endDate,
                action: 'renew_plan'
            }
        });
    }

    /**
     * Notificar contato via WhatsApp
     * @param {string} ownerId - ID do dono do imóvel
     * @param {string} propertyId - ID do imóvel
     * @param {string} propertyTitle - Título do imóvel
     * @returns {Object} - Resultado da operação
     */
    async notifyWhatsAppContact(ownerId, propertyId, propertyTitle) {
        console.log(`💬 Notificando contato via WhatsApp: "${propertyTitle}"`);
        
        return this.createNotification({
            userId: ownerId,
            type: 'whatsapp_contact',
            title: '💬 Novo Interessado!',
            message: `Alguém demonstrou interesse no seu anúncio "${propertyTitle}" e clicou no botão de WhatsApp!`,
            data: { 
                property_id: propertyId,
                property_title: propertyTitle,
                contact_type: 'whatsapp',
                action: 'view_property'
            }
        });
    }

    /**
     * Notificar admins sobre contato via WhatsApp
     * @param {string} propertyId - ID do imóvel
     * @param {string} propertyTitle - Título do imóvel
     * @param {string} ownerName - Nome do dono (opcional)
     * @returns {Object} - Resultado da operação
     */
    async notifyAdminsWhatsAppContact(propertyId, propertyTitle, ownerName = null) {
        try {
            console.log(`📊 Notificando admins sobre contato: "${propertyTitle}"`);

            // Buscar todos os usuários com is_admin = true
            const { data: admins, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('is_admin', true);

            if (error) {
                console.error('❌ Erro ao buscar admins:', error);
                throw error;
            }

            if (!admins || admins.length === 0) {
                console.log('⚠️ Nenhum admin encontrado');
                return { success: false, error: 'Nenhum admin encontrado' };
            }

            console.log(`📧 Enviando notificação para ${admins.length} admin(s)`);

            // Criar notificação para cada admin
            const notifications = await Promise.all(
                admins.map(admin => 
                    this.createNotification({
                        userId: admin.id,
                        type: 'whatsapp_contact',
                        title: '📊 Novo Contato no Sistema',
                        message: `${ownerName || 'Um usuário'} recebeu um contato via WhatsApp no anúncio "${propertyTitle}"`,
                        data: { 
                            property_id: propertyId,
                            property_title: propertyTitle,
                            owner_name: ownerName,
                            is_admin_notification: true,
                            action: 'view_property'
                        }
                    })
                )
            );

            const successCount = notifications.filter(n => n.success).length;
            console.log(`✅ ${successCount}/${admins.length} notificações enviadas aos admins`);

            return { 
                success: true, 
                notifications,
                sent: successCount,
                total: admins.length
            };

        } catch (error) {
            console.error('❌ Erro ao notificar admins:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Limpar notificações antigas (lidas com mais de 30 dias)
     * @returns {Object} - Resultado da operação
     */
    async cleanupOldNotifications() {
        try {
            console.log('🧹 Limpando notificações antigas...');

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { error, count } = await supabase
                .from('in_app_notifications')
                .delete()
                .eq('read', true)
                .lt('created_at', thirtyDaysAgo.toISOString());

            if (error) {
                console.error('❌ Erro ao limpar notificações:', error);
                throw error;
            }

            console.log(`✅ ${count || 0} notificações antigas removidas`);
            return { success: true, deleted: count || 0 };

        } catch (error) {
            console.error('❌ Erro ao limpar notificações:', error);
            return { success: false, error: error.message };
        }
    }
}

// Exportar instância singleton (opcional)
export const inAppNotificationService = new InAppNotificationService();

