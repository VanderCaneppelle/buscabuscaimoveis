// Script para testar os endpoints de notificação
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3000'; // Para teste local
// const API_BASE_URL = 'https://seu-dominio.vercel.app'; // Para produção

// Função para fazer requisições
async function makeRequest(endpoint, method = 'GET', body = null) {
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        console.log(`\n🔄 ${method} ${url}`);
        if (body) {
            console.log('📤 Body:', JSON.stringify(body, null, 2));
        }

        const response = await fetch(url, options);
        const data = await response.json();

        console.log(`📊 Status: ${response.status}`);
        console.log('📥 Response:', JSON.stringify(data, null, 2));

        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.error('❌ Erro na requisição:', error.message);
        return { success: false, error: error.message };
    }
}

// Testes dos endpoints
async function testNotificationEndpoints() {
    console.log('🧪 Iniciando testes dos endpoints de notificação...\n');

    // Teste 1: Verificar status do sistema
    console.log('1️⃣ Testando status do sistema...');
    await makeRequest('/api/notifications?action=status');

    // Teste 2: Registrar token de dispositivo
    console.log('\n2️⃣ Testando registro de token...');
    const registerResult = await makeRequest('/api/notifications?action=register', 'POST', {
        token: 'ExponentPushToken[test-token-123]',
        userId: 'test-user-id-123',
        platform: 'android'
    });

    // Teste 3: Enviar notificação para usuário específico
    console.log('\n3️⃣ Testando envio para usuário específico...');
    await makeRequest('/api/notifications?action=send', 'POST', {
        title: '🧪 Teste de Notificação',
        body: 'Esta é uma notificação de teste!',
        data: { type: 'test', timestamp: new Date().toISOString() },
        userId: 'test-user-id-123',
        sendToAll: false
    });

    // Teste 4: Enviar notificação para todos os dispositivos
    console.log('\n4️⃣ Testando envio para todos os dispositivos...');
    await makeRequest('/api/notifications?action=send', 'POST', {
        title: '📢 Notificação Global',
        body: 'Esta é uma notificação para todos os usuários!',
        data: { type: 'global_test', timestamp: new Date().toISOString() },
        sendToAll: true
    });

    // Teste 5: Enviar notificações agendadas
    console.log('\n5️⃣ Testando notificações agendadas...');
    await makeRequest('/api/notifications?action=schedule', 'POST');

    // Teste 6: Testar endpoint inexistente
    console.log('\n6️⃣ Testando endpoint inexistente...');
    await makeRequest('/api/notifications?action=invalid');

    console.log('\n🏁 Testes concluídos!');
}

// Executar testes se o script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    testNotificationEndpoints().catch(console.error);
}

export { testNotificationEndpoints };
