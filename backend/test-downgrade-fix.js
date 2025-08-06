import axios from 'axios';

const BACKEND_URL = 'https://buscabusca.vercel.app';

async function testDowngradeLogic() {
    try {
        console.log('🧪 Testando lógica de downgrade...\n');

        // 1. Buscar planos disponíveis
        console.log('1️⃣ Buscando planos...');
        const plansResponse = await axios.get(`${BACKEND_URL}/api/test/plans`);
        console.log('Planos disponíveis:', plansResponse.data.plans);

        // 2. Buscar usuários com pagamentos
        console.log('\n2️⃣ Buscando usuários com pagamentos...');
        const paymentsResponse = await axios.get(`${BACKEND_URL}/api/test/payments`);
        console.log('Pagamentos encontrados:', paymentsResponse.data);

        // 3. Se houver usuários, testar com o primeiro
        if (paymentsResponse.data.payments && paymentsResponse.data.payments.length > 0) {
            const firstPayment = paymentsResponse.data.payments[0];
            const userId = firstPayment.user_id;

            console.log(`\n3️⃣ Testando com usuário: ${userId}`);

            // Buscar anúncios do usuário
            const adsResponse = await axios.get(`${BACKEND_URL}/api/test/user-ads?userId=${userId}`);
            console.log('Anúncios do usuário:', adsResponse.data);

            // Buscar plano gratuito
            const freePlan = plansResponse.data.plans.find(p => p.price === 0);
            if (freePlan) {
                console.log(`\n4️⃣ Testando downgrade para plano: ${freePlan.name}`);

                const testData = {
                    plan: freePlan,
                    user: {
                        id: userId,
                        email: 'test@test.com'
                    }
                };

                console.log('Dados de teste:', testData);

                const downgradeResponse = await axios.post(`${BACKEND_URL}/api/payments/create`, testData);
                console.log('Resposta do downgrade:', downgradeResponse.data);
            } else {
                console.log('❌ Plano gratuito não encontrado');
            }
        } else {
            console.log('❌ Nenhum usuário com pagamentos encontrado');
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.response?.data || error.message);
    }
}

testDowngradeLogic(); 