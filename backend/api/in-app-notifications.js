/**
 * =====================================================
 * API DE NOTIFICAÇÕES IN-APP
 * =====================================================
 * Endpoint consolidado para gerenciar notificações in-app
 * =====================================================
 */

import { InAppNotificationService } from '../lib/inAppNotificationService.js';

export default async function handler(req, res) {
    // Configurar CORS
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Responder OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;
        const service = new InAppNotificationService();

        console.log(`📱 API In-App Notifications - Action: ${action}`);

        switch (action) {
            case 'create':
                return await handleCreate(req, res, service);
            
            case 'get':
                return await handleGet(req, res, service);
            
            case 'mark-read':
                return await handleMarkRead(req, res, service);
            
            case 'mark-unread':
                return await handleMarkUnread(req, res, service);
            
            case 'mark-all-read':
                return await handleMarkAllRead(req, res, service);
            
            case 'count-unread':
                return await handleCountUnread(req, res, service);
            
            case 'delete':
                return await handleDelete(req, res, service);
            
            case 'notify-admins':
                return await handleNotifyAdmins(req, res, service);
            
            case 'cleanup':
                return await handleCleanup(req, res, service);
            
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Ação não especificada ou inválida',
                    validActions: [
                        'create',
                        'get',
                        'mark-read',
                        'mark-unread',
                        'mark-all-read',
                        'count-unread',
                        'delete',
                        'notify-admins',
                        'cleanup'
                    ]
                });
        }
    } catch (error) {
        console.error('❌ Erro na API de notificações in-app:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}

// =====================================================
// HANDLERS DAS AÇÕES
// =====================================================

/**
 * Criar uma notificação
 * POST /api/in-app-notifications?action=create
 * Body: { userId, type, title, message, data }
 */
async function handleCreate(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { userId, type, title, message, data } = req.body;

    // Validação
    if (!userId || !type || !title || !message) {
        return res.status(400).json({
            success: false,
            error: 'Campos obrigatórios: userId, type, title, message'
        });
    }

    // Validar tipo
    const validTypes = ['property_approved', 'property_rejected', 'plan_expiring', 'whatsapp_contact'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            success: false,
            error: `Tipo inválido. Tipos válidos: ${validTypes.join(', ')}`
        });
    }

    const result = await service.createNotification({
        userId,
        type,
        title,
        message,
        data: data || {}
    });

    if (result.success) {
        return res.status(201).json({
            success: true,
            message: 'Notificação criada com sucesso',
            data: result.data
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao criar notificação',
            details: result.error
        });
    }
}

/**
 * Buscar notificações
 * GET /api/in-app-notifications?action=get&userId=xxx&unreadOnly=true&limit=50
 */
async function handleGet(req, res, service) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { userId, unreadOnly, limit } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId é obrigatório'
        });
    }

    const result = await service.getUserNotifications(
        userId,
        unreadOnly === 'true',
        limit ? parseInt(limit) : 50
    );

    if (result.success) {
        return res.status(200).json({
            success: true,
            data: result.data,
            count: result.count
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar notificações',
            details: result.error,
            data: []
        });
    }
}

/**
 * Marcar como lida
 * POST /api/in-app-notifications?action=mark-read
 * Body: { notificationId }
 */
async function handleMarkRead(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { notificationId } = req.body;

    if (!notificationId) {
        return res.status(400).json({
            success: false,
            error: 'notificationId é obrigatório'
        });
    }

    const result = await service.markAsRead(notificationId);

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Notificação marcada como lida'
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao marcar como lida',
            details: result.error
        });
    }
}

/**
 * Marcar como não lida
 * POST /api/in-app-notifications?action=mark-unread
 * Body: { notificationId }
 */
async function handleMarkUnread(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { notificationId } = req.body;

    if (!notificationId) {
        return res.status(400).json({
            success: false,
            error: 'notificationId é obrigatório'
        });
    }

    const result = await service.markAsUnread(notificationId);

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Notificação marcada como não lida'
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao marcar como não lida',
            details: result.error
        });
    }
}

/**
 * Marcar todas como lidas
 * POST /api/in-app-notifications?action=mark-all-read
 * Body: { userId }
 */
async function handleMarkAllRead(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId é obrigatório'
        });
    }

    const result = await service.markAllAsRead(userId);

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Todas as notificações marcadas como lidas',
            count: result.count
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao marcar todas como lidas',
            details: result.error
        });
    }
}

/**
 * Contar não lidas
 * GET /api/in-app-notifications?action=count-unread&userId=xxx
 */
async function handleCountUnread(req, res, service) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({
            success: false,
            error: 'userId é obrigatório'
        });
    }

    const result = await service.getUnreadCount(userId);

    if (result.success) {
        return res.status(200).json({
            success: true,
            count: result.count
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao contar não lidas',
            details: result.error,
            count: 0
        });
    }
}

/**
 * Deletar notificação
 * DELETE /api/in-app-notifications?action=delete
 * Body: { notificationId }
 */
async function handleDelete(req, res, service) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { notificationId } = req.body || req.query;

    if (!notificationId) {
        return res.status(400).json({
            success: false,
            error: 'notificationId é obrigatório'
        });
    }

    const result = await service.deleteNotification(notificationId);

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Notificação deletada com sucesso'
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao deletar notificação',
            details: result.error
        });
    }
}

/**
 * Notificar admins sobre contato WhatsApp
 * POST /api/in-app-notifications?action=notify-admins
 * Body: { propertyId, propertyTitle, ownerName }
 */
async function handleNotifyAdmins(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const { propertyId, propertyTitle, ownerName } = req.body;

    if (!propertyId || !propertyTitle) {
        return res.status(400).json({
            success: false,
            error: 'propertyId e propertyTitle são obrigatórios'
        });
    }

    const result = await service.notifyAdminsWhatsAppContact(
        propertyId,
        propertyTitle,
        ownerName
    );

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Admins notificados com sucesso',
            sent: result.sent,
            total: result.total
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao notificar admins',
            details: result.error
        });
    }
}

/**
 * Limpar notificações antigas
 * POST /api/in-app-notifications?action=cleanup
 */
async function handleCleanup(req, res, service) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método não permitido' });
    }

    const result = await service.cleanupOldNotifications();

    if (result.success) {
        return res.status(200).json({
            success: true,
            message: 'Notificações antigas removidas',
            deleted: result.deleted
        });
    } else {
        return res.status(500).json({
            success: false,
            error: 'Erro ao limpar notificações',
            details: result.error
        });
    }
}

