import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { paymentId, preferenceId } = req.query;

        if (!paymentId && !preferenceId) {
            return res.status(400).json({ error: 'Payment ID or Preference ID is required' });
        }

        console.log('🔍 Verificando status no banco:', { paymentId, preferenceId });

        let payment = null;
        let searchMethod = '';

        // Buscar por payment_id (ID interno)
        if (paymentId) {
            const { data: paymentById, error: idError } = await supabase
                .from('payments')
                .select('*')
                .eq('id', paymentId)
                .single();

            if (paymentById) {
                payment = paymentById;
                searchMethod = 'payment_id';
                console.log('✅ Pagamento encontrado por payment_id:', payment.id);
            }
        }

        // Se não encontrou, buscar por preference_id
        if (!payment && preferenceId) {
            const { data: paymentByPref, error: prefError } = await supabase
                .from('payments')
                .select('*')
                .eq('mercado_pago_preference_id', preferenceId)
                .single();

            if (paymentByPref) {
                payment = paymentByPref;
                searchMethod = 'preference_id';
                console.log('✅ Pagamento encontrado por preference_id:', payment.id);
            }
        }

        // Se não encontrou, buscar o mais recente pendente
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
            console.log('❌ Nenhum pagamento encontrado');
            return res.status(404).json({
                error: 'Payment not found',
                searchMethod: 'none'
            });
        }

        console.log('✅ Pagamento encontrado:', payment.id, 'método:', searchMethod, 'status:', payment.status);

        return res.status(200).json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                preference_id: payment.mercado_pago_preference_id,
                payment_id: payment.mercado_pago_payment_id,
                amount: payment.amount,
                created_at: payment.created_at,
                updated_at: payment.updated_at
            },
            searchMethod,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 