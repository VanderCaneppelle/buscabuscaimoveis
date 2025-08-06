import axios from 'axios';

const BACKEND_URL = 'https://buscabusca.vercel.app';

async function testDowngradeBlock() {
    try {
        console.log('🧪 Testando bloqueio de downgrade...\n');

        // Teste 1: Tentar fazer downgrade para plano com menos anúncios
        console.log('📋 Teste 1: Downgrade para plano Básico (3 anúncios)');

        const testData = {
            plan: {
                id: 1,
                name: "basic",
                display_name: "Básico",
                price: 29.90,
                max_ads: 3
            },
            user: {
                id: "test-user-with-many-ads",
                email: "test@test.com"
            }
        };

        try {
            const response = await axios.post(`${BACKEND_URL}/api/payments/create`, testData);
            console.log('❌ ERRO: Deveria ter bloqueado o downgrade!');
            console.log('Resposta:', response.data);
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.error === 'downgrade_blocked') {
                console.log('✅ SUCESSO: Downgrade bloqueado corretamente!');
                console.log('Mensagem:', error.response.data.message);
                console.log('Detalhes:', error.response.data.details);
            } else {
                console.log('❌ Erro inesperado:', error.response?.data || error.message);
            }
        }

        console.log('\n📋 Teste 2: Verificar se usuário não existe');

        const testData2 = {
            plan: {
                id: 1,
                name: "basic",
                display_name: "Básico",
                price: 29.90,
                max_ads: 3
            },
            user: {
                id: "usuario-inexistente",
                email: "inexistente@test.com"
            }
        };

        try {
            const response = await axios.post(`${BACKEND_URL}/api/payments/create`, testData2);
            console.log('❌ ERRO: Deveria ter retornado "User not found"!');
            console.log('Resposta:', response.data);
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.error === 'User not found') {
                console.log('✅ SUCESSO: Usuário não encontrado corretamente!');
            } else {
                console.log('❌ Erro inesperado:', error.response?.data || error.message);
            }
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testDowngradeBlock(); 