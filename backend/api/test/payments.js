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
        console.log('🔍 Listando pagamentos no banco...');

        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ Erro ao buscar pagamentos:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        const total = payments.length;
        const pending = payments.filter(p => p.status === 'pending').length;
        const approved = payments.filter(p => p.status === 'approved').length;
        const rejected = payments.filter(p => p.status === 'rejected').length;

        console.log('📊 Estatísticas dos pagamentos:', { total, pending, approved, rejected });

        return res.status(200).json({
            success: true,
            stats: { total, pending, approved, rejected },
            payments: payments.map(p => ({
                id: p.id,
                user_id: p.user_id,
                status: p.status,
                preference_id: p.mercado_pago_preference_id,
                payment_id: p.mercado_pago_payment_id,
                amount: p.amount,
                created_at: p.created_at,
                updated_at: p.updated_at
            }))
        });

    } catch (error) {
        console.error('❌ Erro no endpoint test/payments:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 