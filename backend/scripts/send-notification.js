// Script para enviar notificação específica
import { NotificationService } from '../lib/notificationService.js';
import { DAILY_NOTIFICATIONS } from '../config/notifications.js';

const type = process.argv[2]; // morning, afternoon, evening

async function sendNotification() {
    if (!type || !DAILY_NOTIFICATIONS[type]) {
        console.error('❌ Tipo de notificação inválido. Use: morning, afternoon, evening');
        process.exit(1);
    }

    try {
        const notification = DAILY_NOTIFICATIONS[type];
        console.log(`🕐 Enviando notificação ${type} (${notification.time})...`);

        const notificationService = new NotificationService();


        const result = await notificationService.sendNotificationToAllDevices(
            notification.title,
            notification.body,
            notification.data
        );

        if (result.success) {
            console.log(`✅ Notificação ${type} enviada com sucesso!`);
            console.log(`📊 Enviado para: ${result.sent || 0}/${result.total || 0} dispositivos`);
            
            if (result.invalidTokensRemoved > 0) {
                console.log(`🗑️ Tokens inválidos removidos: ${result.invalidTokensRemoved}`);
            }
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
