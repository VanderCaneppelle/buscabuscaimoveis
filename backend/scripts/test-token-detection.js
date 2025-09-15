import { NotificationService } from '../lib/notificationService.js';

async function testTokenDetection() {
    console.log('🧪 Testando detecção de tokens inválidos...');
    
    const notificationService = new NotificationService();
    
    // Token inválido de exemplo (baseado no log)
    const invalidToken = 'ExponentPushToken[bjhdt35gw]';
    
    try {
        console.log(`📱 Testando token: ${invalidToken}`);
        
        const result = await notificationService.sendPushNotification(
            invalidToken,
            'Teste de Detecção',
            'Verificando se o token é detectado como inválido...',
            { type: 'token_detection_test' }
        );
        
        console.log('📊 Resultado do teste:');
        console.log(`   Success: ${result.success}`);
        console.log(`   Error: ${result.error}`);
        console.log(`   Token Removed: ${result.tokenRemoved}`);
        
        if (result.tokenRemoved) {
            console.log('✅ Detecção funcionando corretamente!');
        } else {
            console.log('❌ Detecção não funcionou - token não foi removido');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    testTokenDetection()
        .then(() => {
            console.log('✅ Teste de detecção finalizado.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro fatal no teste:', error);
            process.exit(1);
        });
}
