// Script para testar o sistema de notificações
import { NotificationService } from './backend/lib/notificationService.js';

async function testNotifications() {
    console.log('🧪 Iniciando testes do sistema de notificações...\n');

    const notificationService = new NotificationService();

    // Teste 1: Registrar token de dispositivo
    console.log('1️⃣ Testando registro de token...');
    const registerResult = await notificationService.registerDeviceToken(
        'ExponentPushToken[test-token-123]',
        'test-user-id',
        'android'
    );
    console.log('Resultado:', registerResult.success ? '✅ Sucesso' : '❌ Erro');
    if (!registerResult.success) {
        console.log('Erro:', registerResult.error);
    }
    console.log('');

    // Teste 2: Enviar notificação para todos os dispositivos
    console.log('2️⃣ Testando envio para todos os dispositivos...');
    const sendAllResult = await notificationService.sendNotificationToAllDevices(
        '🧪 Teste de Notificação',
        'Esta é uma notificação de teste do sistema!',
        { type: 'test', timestamp: new Date().toISOString() }
    );
    console.log('Resultado:', sendAllResult.success ? '✅ Sucesso' : '❌ Erro');
    if (sendAllResult.success) {
        console.log(`Enviado para: ${sendAllResult.sent}/${sendAllResult.total} dispositivos`);
    } else {
        console.log('Erro:', sendAllResult.error);
    }
    console.log('');

    // Teste 3: Enviar notificação para usuário específico
    console.log('3️⃣ Testando envio para usuário específico...');
    const sendUserResult = await notificationService.sendNotificationToUser(
        'test-user-id',
        '👤 Notificação Personalizada',
        'Esta é uma notificação específica para você!',
        { type: 'personal', userId: 'test-user-id' }
    );
    console.log('Resultado:', sendUserResult.success ? '✅ Sucesso' : '❌ Erro');
    if (sendUserResult.success) {
        console.log(`Enviado para: ${sendUserResult.sent}/${sendUserResult.total} dispositivos do usuário`);
    } else {
        console.log('Erro:', sendUserResult.error);
    }
    console.log('');

    // Teste 4: Simular notificações agendadas
    console.log('4️⃣ Testando notificações agendadas...');
    const scheduledNotifications = [
        {
            time: '09:00',
            title: '🌅 Bom dia!',
            body: 'Que tal conferir as novidades no BuscaBusca Imóveis?',
            data: { type: 'daily_reminder', time: 'morning' }
        },
        {
            time: '15:00',
            title: '☀️ Boa tarde!',
            body: 'Novos imóveis podem ter chegado! Dê uma olhada no app.',
            data: { type: 'daily_reminder', time: 'afternoon' }
        },
        {
            time: '21:00',
            title: '🌙 Boa noite!',
            body: 'Não esqueça de conferir o BuscaBusca Imóveis antes de dormir!',
            data: { type: 'daily_reminder', time: 'evening' }
        }
    ];

    for (const notification of scheduledNotifications) {
        console.log(`Enviando notificação ${notification.time}...`);
        const result = await notificationService.sendNotificationToAllDevices(
            notification.title,
            notification.body,
            notification.data
        );
        console.log(`Resultado ${notification.time}:`, result.success ? '✅ Sucesso' : '❌ Erro');
        if (result.success) {
            console.log(`  Enviado para: ${result.sent}/${result.total} dispositivos`);
        }
    }
    console.log('');

    console.log('🏁 Testes concluídos!');
}

// Executar testes se o script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    testNotifications().catch(console.error);
}

export { testNotifications };
