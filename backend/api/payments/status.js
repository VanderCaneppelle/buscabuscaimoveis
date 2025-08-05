import { getPaymentStatus } from '../../lib/mercadoPago.js';
import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paymentId, preferenceId } = req.method === 'GET' ? req.query : req.body;

        if (!paymentId && !preferenceId) {
            return res.status(400).json({ error: 'Payment ID or Preference ID is required' });
        }

        console.log('🔍 Verificando status do pagamento:', { paymentId, preferenceId });

        // Buscar pagamento no banco
        let query = supabase.from('payments').select('*');

        if (paymentId) {
            query = query.eq('id', paymentId);
        } else if (preferenceId) {
            query = query.eq('mercado_pago_preference_id', preferenceId);
        }

        const { data: payment, error } = await query.single();

        if (error || !payment) {
            console.log('❌ Pagamento não encontrado');
            return res.status(404).json({ error: 'Payment not found' });
        }

        console.log('📊 Status atual no banco:', payment.status);

        // Se o pagamento já tem payment_id do Mercado Pago, verificar status lá
        if (payment.mercado_pago_payment_id) {
            try {
                const mpPayment = await getPaymentStatus(payment.mercado_pago_payment_id);
                console.log('📊 Status no Mercado Pago:', mpPayment.status);

                // Se o status mudou, atualizar no banco
                if (mpPayment.status !== payment.status) {
                    const { error: updateError } = await supabase
                        .from('payments')
                        .update({
                            status: mpPayment.status,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', payment.id);

                    if (updateError) {
                        console.error('❌ Erro ao atualizar status:', updateError);
                    } else {
                        console.log('✅ Status atualizado no banco:', mpPayment.status);
                        payment.status = mpPayment.status;
                    }
                }
            } catch (mpError) {
                console.log('⚠️ Erro ao verificar no Mercado Pago:', mpError.message);
            }
        }

        return res.status(200).json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                preference_id: payment.mercado_pago_preference_id,
                payment_id: payment.mercado_pago_payment_id,
                amount: payment.amount,
                description: payment.description,
                created_at: payment.created_at,
                updated_at: payment.updated_at
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 