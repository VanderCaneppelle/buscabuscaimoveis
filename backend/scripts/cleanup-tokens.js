import { NotificationService } from '../lib/notificationService.js';

async function cleanupInvalidTokens() {
    console.log('🧹 Iniciando limpeza de tokens inválidos...');
    
    const notificationService = new NotificationService();
    
    try {
        const result = await notificationService.cleanupAllInvalidTokens();
        
        if (result.success) {
            console.log(`✅ Limpeza concluída com sucesso!`);
            console.log(`🗑️ Tokens removidos: ${result.removed}`);
        } else {
            console.error(`❌ Erro na limpeza:`, result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Erro fatal na limpeza:', error);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupInvalidTokens()
        .then(() => {
            console.log('✅ Script de limpeza finalizado.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erro fatal no script de limpeza:', error);
            process.exit(1);
        });
}
