import axios from 'axios';

const API_BASE_URL = 'https://buscabusca.vercel.app/api';

const BackendService = {
    // Criar pagamento - versão simplificada
    createPayment: async (plan, user) => {
        try {
            console.log('🚀 Criando pagamento...', { plan: plan.name, user: user.email });

            const response = await fetch(`${API_BASE_URL}/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan, user })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar pagamento');
            }

            const data = await response.json();
            console.log('✅ Pagamento criado:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao criar pagamento:', error);
            throw error;
        }
    },

    // Verificar status do pagamento - versão simplificada
    checkPaymentStatus: async (paymentId) => {
        try {
            console.log('�� Verificando status no banco:', paymentId);

            const response = await fetch(`${API_BASE_URL}/payments/check-status?paymentId=${paymentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao verificar status');
            }

            const data = await response.json();
            console.log('📊 Status no banco:', data.payment?.status);
            return data;
        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            throw error;
        }
    }
};

export default BackendService; 