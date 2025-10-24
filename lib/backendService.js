import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

// 🔍 DEBUG: Verificar se a API_BASE_URL está sendo carregada
console.log('🔍 [BACKEND] API_BASE_URL:', API_BASE_URL);
console.log('🔍 [BACKEND] Environment:', Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT); 

const BackendService = {
    // Criar pagamento - versão simplificada
    createPayment: async (plan, user) => {
        try {
            console.log('🚀 Criando pagamento...', { plan: plan.name, user: user.email });
            console.log('API_BASE_URL - backendService.js:', API_BASE_URL); // https://buscabusca.vercel.app/api
            
            const response = await fetch(`${API_BASE_URL}/api/payments/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan, user })
            });
            console.log('response:', response);
                
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
            console.log('🔍 Verificando status no banco:', paymentId);

            const response = await fetch(`${API_BASE_URL}/api/payments/check-status?paymentId=${paymentId}`, {
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
    },

    // Criar pagamento de boost
    createBoostPayment: async (boostData) => {
        try {
            console.log('🚀 Criando pagamento de boost...', boostData);

            const response = await fetch(`${API_BASE_URL}/api/payments/create-boost`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(boostData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao criar pagamento de boost');
            }

            const data = await response.json();
            console.log('✅ Pagamento de boost criado:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao criar pagamento de boost:', error);
            throw error;
        }
    },
};

export default BackendService; 