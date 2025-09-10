// Script para enviar notificações agendadas
// Este script pode ser executado via GitHub Actions, cron externo, ou serviço de agendamento

import { NotificationService } from '../lib/notificationService.js';

async function sendScheduledNotifications() {
    console.log('🕐 Iniciando envio de notificações agendadas...');

    const notificationService = new NotificationService();
    const now = new Date();
    const currentTime = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });

    console.log(`⏰ Horário atual: ${currentTime}`);

    // Determinar qual notificação enviar baseado no horário
    let notificationToSend = null;

    if (currentTime === '09:00') {
        notificationToSend = {
            time: '09:00',
            title: '🌅 Bom dia!',
            body: 'Que tal conferir as novidades no BuscaBusca Imóveis?',
            data: { type: 'daily_reminder', time: 'morning' }
        };
    } else if (currentTime === '15:00') {
        notificationToSend = {
            time: '15:00',
            title: '☀️ Boa tarde!',
            body: 'Novos imóveis podem ter chegado! Dê uma olhada no app.',
            data: { type: 'daily_reminder', time: 'afternoon' }
        };
    } else if (currentTime === '21:00') {
        notificationToSend = {
            time: '21:00',
            title: '🌙 Boa noite!',
            body: 'Não esqueça de conferir o BuscaBusca Imóveis antes de dormir!',
            data: { type: 'daily_reminder', time: 'evening' }
        };
    }

    if (!notificationToSend) {
        console.log(`⚠️ Nenhuma notificação agendada para ${currentTime}`);
        return;
    }

    try {
        console.log(`📱 Enviando notificação ${notificationToSend.time}...`);

        const result = await notificationService.sendNotificationToAllDevices(
            notificationToSend.title,
            notificationToSend.body,
            notificationToSend.data
        );

        if (result.success) {
            console.log(`✅ Notificação ${notificationToSend.time} enviada com sucesso!`);
            console.log(`📊 Enviado para: ${result.sent}/${result.total} dispositivos`);

            // Log detalhado dos resultados
            if (result.results && result.results.length > 0) {
                const successCount = result.results.filter(r => r.success).length;
                const failureCount = result.results.length - successCount;
                console.log(`📈 Sucessos: ${successCount}, Falhas: ${failureCount}`);
            }
        } else {
            console.error(`❌ Erro ao enviar notificação ${notificationToSend.time}:`, result.error);
        }
    } catch (error) {
        console.error(`❌ Erro ao enviar notificação ${notificationToSend.time}:`, error);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    sendScheduledNotifications()
        .then(() => {
            console.log('🏁 Script de notificações agendadas concluído');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erro no script:', error);
            process.exit(1);
        });
}

export { sendScheduledNotifications };
