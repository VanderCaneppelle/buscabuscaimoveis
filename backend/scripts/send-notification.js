// Script para enviar notificação específica
import { NotificationService } from '../lib/notificationService.js';

const type = process.argv[2]; // morning, afternoon, evening

const notifications = {
    morning: {
        title: '🌅 Bom dia!',
        body: 'Que tal conferir as novidades no BuscaBusca Imóveis?',
        data: { type: 'daily_reminder', time: 'morning' }
    },
    afternoon: {
        title: '☀️ Boa tarde!',
        body: 'Novos imóveis podem ter chegado! Dê uma olhada no app.',
        data: { type: 'daily_reminder', time: 'afternoon' }
    },
    evening: {
        title: '🌙 Boa noite!',
        body: 'Não esqueça de conferir o BuscaBusca Imóveis antes de dormir!',
        data: { type: 'daily_reminder', time: 'evening' }
    }
};

async function sendNotification() {
    if (!type || !notifications[type]) {
        console.error('❌ Tipo de notificação inválido. Use: morning, afternoon, evening');
        process.exit(1);
    }

    try {
        console.log(`🕐 Enviando notificação ${type}...`);
        
        const notificationService = new NotificationService();
        const notification = notifications[type];
        
        const result = await notificationService.sendNotificationToAllDevices(
            notification.title,
            notification.body,
            notification.data
        );

        if (result.success) {
            console.log(`✅ Notificação ${type} enviada com sucesso!`);
            console.log(`📊 Enviado para: ${result.sent}/${result.total} dispositivos`);
        } else {
            console.error(`❌ Erro ao enviar notificação ${type}:`, result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error(`❌ Erro ao enviar notificação ${type}:`, error);
        process.exit(1);
    }
}

sendNotification();
