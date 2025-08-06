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
        const { paymentId, status = 'approved' } = req.body;

        if (!paymentId) {
            return res.status(400).json({ error: 'Payment ID is required' });
        }

        console.log('🧪 Simulando webhook para pagamento:', paymentId, 'Status:', status);

        // Buscar pagamento no banco
        const { data: payment, error: fetchError } = await supabase
            .from('payments')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (fetchError || !payment) {
            console.log('❌ Pagamento não encontrado:', paymentId);
            return res.status(404).json({ error: 'Payment not found' });
        }

        console.log('✅ Pagamento encontrado:', payment.id, 'Status atual:', payment.status);

        // Atualizar status do pagamento
        const { error: updateError } = await supabase
            .from('payments')
            .update({
                status: status,
                mercado_pago_payment_id: `simulated_${Date.now()}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);

        if (updateError) {
            console.error('❌ Erro ao atualizar pagamento:', updateError);
            return res.status(500).json({ error: 'Failed to update payment' });
        }

        console.log('✅ Pagamento atualizado para:', status);

        // Se aprovado, ativar assinatura
        if (status === 'approved') {
            console.log('🎉 Ativando assinatura...');

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
                        mercado_pago_subscription_id: `simulated_${Date.now()}`
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
            message: 'Webhook simulated successfully',
            payment_id: paymentId,
            status: status
        });

    } catch (error) {
        console.error('❌ Erro ao simular webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 