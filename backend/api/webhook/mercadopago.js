import { getPaymentStatus } from '../../lib/mercadoPago.js';
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
        const mpPayment = await getPaymentStatus(paymentId);
        console.log('📊 Status do pagamento:', mpPayment.status);
        console.log('📊 Dados do pagamento:', JSON.stringify(mpPayment, null, 2));

        // Buscar pagamento no banco de várias formas
        let payment = null;
        let error = null;

        // 1. Primeiro, tentar buscar pelo preference_id
        if (mpPayment.preference_id) {
            const { data, error: prefError } = await supabase
                .from('payments')
                .select('*')
                .eq('mercado_pago_preference_id', mpPayment.preference_id)
                .eq('status', 'pending')
                .single();

            if (data) {
                payment = data;
                console.log('✅ Pagamento encontrado pelo preference_id:', payment.id);
            } else {
                console.log('❌ Pagamento não encontrado pelo preference_id:', mpPayment.preference_id);
            }
        }

        // 2. Se não encontrou, buscar pelo external_reference
        if (!payment && mpPayment.external_reference) {
            const { data, error: extError } = await supabase
                .from('payments')
                .select('*')
                .eq('external_reference', mpPayment.external_reference)
                .eq('status', 'pending')
                .single();

            if (data) {
                payment = data;
                console.log('✅ Pagamento encontrado pelo external_reference:', payment.id);
            } else {
                console.log('❌ Pagamento não encontrado pelo external_reference:', mpPayment.external_reference);
            }
        }

        // 3. Se ainda não encontrou, buscar o pagamento mais recente pendente
        if (!payment) {
            const { data, error: recentError } = await supabase
                .from('payments')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                payment = data;
                console.log('✅ Pagamento encontrado (mais recente pendente):', payment.id);
            } else {
                console.log('❌ Nenhum pagamento pendente encontrado');
            }
        }

        if (!payment) {
            console.log('❌ Pagamento não encontrado no banco');
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

        // Log de sucesso para pagamento aprovado
        if (mpPayment.status === 'approved') {
            console.log('🎉 Pagamento aprovado! WebSocket será notificado automaticamente.');
        }

        // Se o pagamento foi aprovado, ativar a assinatura
        if (mpPayment.status === 'approved') {
            console.log('🎉 Pagamento aprovado! Ativando assinatura...');

            // Extrair plan_id da descrição
            const planMatch = payment.description.match(/plano ([a-f0-9-]+)/);
            if (planMatch) {
                const planId = planMatch[1];
                const userId = payment.user_id;

                // Criar/atualizar assinatura
                const { error: subscriptionError } = await supabase
                    .from('user_subscriptions')
                    .upsert({
                        user_id: userId,
                        plan_id: planId,
                        status: 'active',
                        start_date: new Date().toISOString(),
                        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
                        payment_id: payment.id,
                        mercado_pago_subscription_id: paymentId
                    });

                if (subscriptionError) {
                    console.error('❌ Erro ao ativar assinatura:', subscriptionError);
                } else {
                    console.log('✅ Assinatura ativada para usuário:', userId);
                }
            } else {
                console.error('❌ Não foi possível extrair plan_id da descrição:', payment.description);
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