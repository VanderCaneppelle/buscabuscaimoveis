import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            message: 'Webhook test endpoint is working!',
            timestamp: new Date().toISOString()
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const webhookData = req.body;
        console.log('🧪 TESTE WEBHOOK RECEBIDO:', JSON.stringify(webhookData, null, 2));

        const { type, data } = webhookData;

        // Processar apenas webhooks de pagamento
        if (type !== 'payment') {
            console.log('⚠️ Webhook ignorado - tipo não é payment:', type);
            return res.status(200).json({ message: 'Webhook ignored - not a payment' });
        }

        const paymentId = data.id;
        console.log('📊 Processando pagamento:', paymentId);

        // Buscar pagamento no banco pelo preference_id
        const { data: payments, error: paymentError } = await supabase
            .from('payments')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5);

        if (paymentError) {
            console.error('❌ Erro ao buscar pagamentos:', paymentError);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log('📋 Pagamentos pendentes encontrados:', payments?.length || 0);

        // Buscar detalhes do pagamento no Mercado Pago
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

        const mpPayment = await response.json();
        console.log('📊 Status do pagamento no MP:', mpPayment.status);
        console.log('📊 Preference ID:', mpPayment.preference_id);

        let payment = null;
        let searchMethod = '';

        // Se temos preference_id, tentar buscar por ele
        if (mpPayment.preference_id) {
            const { data: prefPayment, error: prefError } = await supabase
                .from('payments')
                .select('*')
                .eq('mercado_pago_preference_id', mpPayment.preference_id)
                .eq('status', 'pending')
                .single();

            if (prefPayment) {
                payment = prefPayment;
                searchMethod = 'preference_id';
                console.log('✅ Pagamento encontrado pelo preference_id:', payment.id);
            }
        }

        // Se não encontrou pelo preference_id, buscar o mais recente pendente
        if (!payment) {
            const { data: recentPayment, error: recentError } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (recentPayment) {
                payment = recentPayment;
                searchMethod = 'mais_recente';
                console.log('✅ Pagamento encontrado (mais recente):', payment.id);
            }
        }

        if (!payment) {
            console.error('❌ Nenhum pagamento pendente encontrado');
            return res.status(404).json({
                error: 'No pending payment found',
                preference_id: mpPayment.preference_id,
                available_payments: payments?.map(p => ({
                    id: p.id,
                    preference_id: p.mercado_pago_preference_id,
                    created_at: p.created_at
                }))
            });
        }

        console.log('✅ Pagamento encontrado no banco:', payment.id, 'método:', searchMethod);

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
            const { error: cancelError } = await supabase
                .from('user_subscriptions')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('user_id', payment.user_id)
                .eq('status', 'active');

            if (cancelError) {
                console.error('❌ Erro ao cancelar assinatura anterior:', cancelError);
            } else {
                console.log('✅ Assinatura anterior cancelada');
            }

            // Criar nova assinatura
            const subscriptionEndDate = new Date();
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30); // 30 dias

            const { data: newSubscription, error: subscriptionError } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: payment.user_id,
                    plan_id: payment.plan_id,
                    status: 'active',
                    start_date: new Date().toISOString(),
                    end_date: subscriptionEndDate.toISOString(),
                    payment_id: payment.id
                })
                .select()
                .single();

            if (subscriptionError) {
                console.error('❌ Erro ao criar assinatura:', subscriptionError);
            } else {
                console.log('✅ Nova assinatura criada:', newSubscription.id);
            }
        }

        return res.status(200).json({
            success: true,
            message: 'Test webhook processed successfully',
            payment_id: payment.id,
            status: mpPayment.status,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro no teste webhook:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
} 