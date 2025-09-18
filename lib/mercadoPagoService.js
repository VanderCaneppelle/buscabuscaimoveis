import { supabase } from './supabase';

// Configuração do Mercado Pago
const MERCADO_PAGO_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN || 'TEST-4373011936551233-080510-185a2672cd4dd45183cf4aafeb9df9b8-256582298';
const MERCADO_PAGO_PUBLIC_KEY = process.env.EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || 'TEST-6e4aaf5e-e94b-4fc9-ad34-89ddc7cc02fd';

console.log('🔧 Configuração Mercado Pago:', {
    accessToken: MERCADO_PAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado',
    publicKey: MERCADO_PAGO_PUBLIC_KEY ? '✅ Configurado' : '❌ Não configurado'
});

export class MercadoPagoService {
    // Criar preferência de pagamento
    static async createPaymentPreference(plan, user) {
        try {
            console.log('🚀 Criando preferência de pagamento:', { plan, user: user.email });

            const preference = {
                items: [
                    {
                        title: `Plano ${plan.display_name} - Busca Busca Imóveis`,
                        unit_price: parseFloat(plan.price),
                        quantity: 1,
                        currency_id: 'BRL',
                        description: `Assinatura do plano ${plan.display_name} por 1 mês`
                    }
                ],
                payer: {
                    name: user.user_metadata?.full_name || user.email,
                    email: user.email
                },
                back_urls: {
                    success: `buscabuscaimoveis://payment/success`,
                    failure: `buscabuscaimoveis://payment/error`,
                    pending: `buscabuscaimoveis://payment/pending`
                },
                auto_return: 'approved',
                external_reference: `plan_${plan.id}_user_${user.id}`,
                // notification_url: `https://rxozhlxmfbioqgqomkrz.supabase.co/rest/v1/rpc/process_mercado_pago_webhook`,
                expires: true,
                expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
            };

            console.log('📤 Enviando requisição para Mercado Pago...');
            console.log('🔑 Token:', MERCADO_PAGO_ACCESS_TOKEN ? '✅ Presente' : '❌ Ausente');
            console.log('🔗 Webhook URL: Supabase RPC');

            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preference)
            });

            console.log('📊 Resposta do Mercado Pago:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro detalhado:', errorText);
                throw new Error(`Erro ao criar preferência de pagamento: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao criar preferência:', error);
            throw error;
        }
    }

    // Registrar pagamento no banco
    static async registerPayment(userId, planId, preferenceId, amount) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .insert({
                    user_id: userId,
                    amount: amount,
                    currency: 'BRL',
                    status: 'pending',
                    payment_method: 'mercadopago',
                    mercado_pago_preference_id: preferenceId,
                    description: `Pagamento do plano ${planId}`
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            throw error;
        }
    }

    // Atualizar status do pagamento
    static async updatePaymentStatus(paymentId, status, mercadoPagoPaymentId = null) {
        try {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (mercadoPagoPaymentId) {
                updateData.mercado_pago_payment_id = mercadoPagoPaymentId;
            }

            const { data, error } = await supabase
                .from('payments')
                .update(updateData)
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao atualizar status do pagamento:', error);
            throw error;
        }
    }





    // Verificar status do pagamento
    static async checkPaymentStatus(paymentId) {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`
                }
            });

            if (!response.ok) {
                throw new Error('Erro ao verificar status do pagamento');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            throw error;
        }
    }

    // Obter histórico de pagamentos do usuário
    static async getUserPayments(userId) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    user_subscriptions (
                        *,
                        plans (
                            name,
                            display_name
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao obter pagamentos:', error);
            return [];
        }
    }
} 