import { createPaymentPreference } from '../../lib/mercadoPago.js';
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
        const { plan, user } = req.body;

        if (!plan || !user) {
            return res.status(400).json({ error: 'Plan and user are required' });
        }

        console.log('📝 Criando preferência de pagamento:', { plan: plan.name, user: user.email });

        // Verificar se o usuário existe
        const { data: userExists, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

        if (userError || !userExists) {
            console.error('❌ Usuário não encontrado:', user.id);
            return res.status(400).json({ error: 'User not found' });
        }

        console.log('✅ Usuário encontrado:', userExists.id);

        // Criar preferência no Mercado Pago
        const preference = await createPaymentPreference(plan, user);

        // Registrar pagamento no banco
        const { data: payment, error } = await supabase
            .from('payments')
            .insert({
                user_id: user.id,
                amount: plan.price,
                currency: 'BRL',
                status: 'pending',
                payment_method: 'mercado_pago',
                mercado_pago_preference_id: preference.id,
                description: `Plano ${plan.display_name} - ${plan.name}`
                // Removendo external_reference pois não existe na tabela
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao registrar pagamento:', error);
            return res.status(500).json({ error: 'Failed to register payment', details: error.message });
        }

        console.log('✅ Preferência criada com sucesso:', preference.id);

        return res.status(200).json({
            success: true,
            preference: {
                id: preference.id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point
            },
            payment: {
                id: payment.id,
                status: payment.status
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint create:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 