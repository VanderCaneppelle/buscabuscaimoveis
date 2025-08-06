import axios from 'axios';

const BACKEND_URL = 'https://buscabusca.vercel.app';

const backendApi = axios.create({
    baseURL: BACKEND_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const BackendService = {
    // Criar preferência de pagamento
    createPayment: async (plan, user) => {
        try {
            console.log('📝 Criando pagamento no backend:', { plan: plan.name, user: user.user_id });

            const response = await backendApi.post('/api/payments/create', {
                plan,
                user
            });

            console.log('✅ Pagamento criado:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao criar pagamento:', error.response?.data || error.message);
            throw error;
        }
    },

    // Verificar status do pagamento
    checkPaymentStatus: async (paymentId) => {
        try {
            console.log('🔍 Verificando status do pagamento:', paymentId);

            // Primeiro tentar buscar por paymentId (pode ser UUID interno ou ID do Mercado Pago)
            let response = await backendApi.get(`/api/payments/status?paymentId=${paymentId}`);

            console.log('✅ Status do pagamento:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error.response?.data || error.message);
            throw error;
        }
    },

    // Verificar status por preference_id
    checkPaymentStatusByPreference: async (preferenceId) => {
        try {
            console.log('🔍 Verificando status por preference_id:', preferenceId);

            const response = await backendApi.post('/api/payments/status', {
                preferenceId
            });

            console.log('✅ Status do pagamento:', response.data);
            return response.data;
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error.response?.data || error.message);
            throw error;
        }
    }
}; 