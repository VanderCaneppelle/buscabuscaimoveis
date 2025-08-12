import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const webhookData = req.body;
        console.log('🔔 Webhook recebido:', JSON.stringify(webhookData, null, 2));

        const { type, data } = webhookData;

        // Processar apenas webhooks de pagamento
        if (type !== 'payment') {
            console.log('⚠️ Webhook ignorado - tipo não é payment:', type);
            return res.status(200).json({ message: 'Webhook ignored - not a payment' });
        }

        const paymentId = data.id;
        console.log('📊 Processando pagamento:', paymentId);

        // Buscar detalhes do pagamento no Mercado Pago
        const mpPayment = await getMercadoPagoPayment(paymentId);
        console.log('📊 Status do pagamento:', mpPayment.status);

        // Buscar pagamento no banco
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('mercado_pago_preference_id', mpPayment.preference_id)
            .eq('status', 'pending')
            .single();

        if (paymentError || !payment) {
            console.error('❌ Pagamento não encontrado no banco:', paymentError);
            return res.status(404).json({ error: 'Payment not found' });
        }

        console.log('✅ Pagamento encontrado no banco:', payment.id);

        // Atualizar pagamento no banco
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: mpPayment.status,
                mercado_pago_payment_id: paymentId,
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

        if (updateError) {
            console.error('❌ Erro ao atualizar pagamento:', updateError);
            return res.status(500).json({ error: 'Failed to update payment' });
        }

        console.log('✅ Pagamento atualizado no banco:', mpPayment.status);

        // Se o pagamento foi aprovado, criar/atualizar user_subscription
        if (mpPayment.status === 'approved') {
            console.log('🎉 Pagamento aprovado! Criando assinatura...');

            // Cancelar assinatura anterior se existir
            await supabase
                .from('user_subscriptions')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('user_id', payment.user_id)
                .eq('status', 'active');

            // Criar nova assinatura
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30); // 30 dias

            const { error: subscriptionError } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: payment.user_id,
                    plan_id: payment.plan_id,
                    status: 'active',
                    start_date: new Date().toISOString(),
                    end_date: subscriptionEndDate.toISOString(),
                    payment_id: payment.id
                });

            if (subscriptionError) {
                console.error('❌ Erro ao criar assinatura:', subscriptionError);
            } else {
                console.log('✅ Nova assinatura criada');
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            payment_id: payment.id,
            status: mpPayment.status
        });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Função para buscar pagamento no Mercado Pago
async function getMercadoPagoPayment(paymentId) {
    const MERCADO_PAGO_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN;

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
        throw new Error('Token do Mercado Pago não configurado');
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
            'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Erro ao buscar pagamento: ${response.status}`);
    }

    return await response.json();
} 