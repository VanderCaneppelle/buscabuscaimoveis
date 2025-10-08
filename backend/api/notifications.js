import { NotificationService } from '../lib/notificationService.js';
import { SCHEDULED_NOTIFICATIONS } from '../config/notifications.js';

export default async function handler(req, res) {
    // Configurar CORS (abrangente para suportar origem 'null' do file://)
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', '*'); // permitir todas as origens, incluindo 'null'
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action } = req.query;
        const notificationService = new NotificationService();

        switch (action) {
            case 'register':
                return await handleRegister(req, res, notificationService);

            case 'send':
                return await handleSend(req, res, notificationService);

            case 'schedule':
                return await handleSchedule(req, res, notificationService);

            case 'status':
                return await handleStatus(req, res, notificationService);

            case 'property-approved':
                return await handlePropertyApproved(req, res, notificationService);

            case 'property-rejected':
                return await handlePropertyRejected(req, res, notificationService);

            default:
                return res.status(400).json({
                    error: 'Ação não especificada. Use: register, send, schedule, status, property-approved ou property-rejected'
                });
        }
    } catch (error) {
        console.error('❌ Erro na API de notificações:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}

// Registrar token do dispositivo
async function handleRegister(req, res, notificationService) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { token, userId, deviceInfo } = req.body;

    if (!token || !userId) {
        return res.status(400).json({
            error: 'Token e userId são obrigatórios'
        });
    }

    const result = await notificationService.registerDeviceToken(token, userId, deviceInfo);

    if (result.success) {
        return res.status(200).json({
            message: 'Token registrado com sucesso',
            data: result.data
        });
    } else {
        return res.status(500).json({
            error: 'Erro ao registrar token',
            details: result.error
        });
    }
}

// Enviar notificação push
async function handleSend(req, res, notificationService) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { title, body, data, userId, sendToAll } = req.body;

    if (!title || !body) {
        return res.status(400).json({
            error: 'Title e body são obrigatórios'
        });
    }

    let result;

    if (sendToAll) {
        result = await notificationService.sendNotificationToAllDevices(title, body, data);
    } else if (userId) {
        result = await notificationService.sendNotificationToUser(userId, title, body, data);
    } else {
        return res.status(400).json({
            error: 'userId ou sendToAll deve ser especificado'
        });
    }

    if (result.success) {
        return res.status(200).json({
            message: 'Notificação enviada com sucesso',
            sent: result.sent,
            total: result.total,
            results: result.results
        });
    } else {
        return res.status(500).json({
            error: 'Erro ao enviar notificação',
            details: result.error
        });
    }
}

// Enviar notificação de anúncio aprovado (centralizado)
// Handler para notificação de anúncio aprovado
async function handlePropertyApproved(req, res, notificationService) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { userId, propertyId } = req.body;
    if (!userId || !propertyId) {
        return res.status(400).json({ error: 'userId e propertyId são obrigatórios' });
    }

    const result = await notificationService.sendPropertyApprovedById(userId, propertyId);

    if (result.success) {
        return res.status(200).json({
            message: 'Notificação de aprovação enviada com sucesso',
            sent: result.sent,
            total: result.total,
            results: result.results
        });
    } else {
        return res.status(500).json({
            error: 'Erro ao enviar notificação de aprovação',
            details: result.error
        });
    }
}

// Handler para notificação de anúncio rejeitado
async function handlePropertyRejected(req, res, notificationService) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { userId, propertyId, reason } = req.body;
    if (!userId || !propertyId) {
        return res.status(400).json({ error: 'userId e propertyId são obrigatórios' });
    }

    const result = await notificationService.sendPropertyRejectedById(userId, propertyId, reason);

    if (result.success) {
        return res.status(200).json({
            message: 'Notificação de rejeição enviada com sucesso',
            sent: result.sent,
            total: result.total,
            results: result.results
        });
    } else {
        return res.status(500).json({
            error: 'Erro ao enviar notificação de rejeição',
            details: result.error
        });
    }
}

// Enviar notificações agendadas
async function handleSchedule(req, res, notificationService) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const scheduledNotifications = SCHEDULED_NOTIFICATIONS;

    const results = [];

    for (const notification of scheduledNotifications) {
        const result = await notificationService.sendNotificationToAllDevices(
            notification.title,
            notification.body,
            notification.data
        );

        results.push({
            time: notification.time,
            result: result
        });
    }

    const totalSent = results.reduce((sum, r) => sum + (r.result.sent || 0), 0);
    const totalDevices = results[0]?.result.total || 0;

    console.log(`✅ Notificações agendadas enviadas: ${totalSent}/${totalDevices * 3}`);

    return res.status(200).json({
        message: 'Notificações agendadas enviadas com sucesso',
        totalSent,
        totalDevices,
        results
    });
}

// Verificar status do sistema
async function handleStatus(req, res, notificationService) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Aqui você pode adicionar lógica para verificar status
        // Por exemplo, contar tokens registrados, etc.

        return res.status(200).json({
            message: 'Sistema de notificações funcionando',
            timestamp: new Date().toISOString(),
            status: 'active'
        });
    } catch (error) {
        return res.status(500).json({
            error: 'Erro ao verificar status',
            details: error.message
        });
    }
}

