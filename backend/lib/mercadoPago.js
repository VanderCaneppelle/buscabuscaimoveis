import axios from 'axios';

const MERCADO_PAGO_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN;

if (!MERCADO_PAGO_ACCESS_TOKEN) {
    throw new Error('Missing Mercado Pago access token');
}

const mercadoPagoApi = axios.create({
    baseURL: 'https://api.mercadopago.com',
    headers: {
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

export const createPaymentPreference = async (plan, user) => {
    try {
        const preference = {
            items: [
                {
                    title: `Plano ${plan.display_name}`,
                    unit_price: plan.price,
                    quantity: 1,
                    currency_id: 'BRL'
                }
            ],
            payer: {
                name: user.user_metadata?.full_name || 'Usuário',
                email: user.email || `${user.id}@buscabusca.com` // Fallback email se user.email for undefined
            },
            back_urls: {
                success: 'https://buscabusca.vercel.app/api/payments/success',
                failure: 'https://buscabusca.vercel.app/api/payments/failure',
                pending: 'https://buscabusca.vercel.app/api/payments/pending'
            },
            notification_url: 'https://buscabusca.vercel.app/api/webhook/mercadopago',
            external_reference: `plan_${plan.id}_user_${user.id}`,
            auto_return: 'approved',
            expires: true,
            expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        };

        const response = await mercadoPagoApi.post('/checkout/preferences', preference);
        return response.data;
    } catch (error) {
        console.error('Erro ao criar preferência de pagamento:', error.response?.data || error.message);
        throw error;
    }
};

export const getPaymentStatus = async (paymentId) => {
    try {
        const response = await mercadoPagoApi.get(`/v1/payments/${paymentId}`);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar status do pagamento:', error.response?.data || error.message);
        throw error;
    }
}; 