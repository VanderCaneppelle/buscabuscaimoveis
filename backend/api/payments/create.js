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

        console.log('📦 Dados recebidos:', {
            plan: plan?.name,
            user: user?.email,
            userId: user?.id
        });

        if (!plan || !user) {
            return res.status(400).json({ error: 'Plan and user are required' });
        }

        // Criar preferência no Mercado Pago diretamente
        const preference = await createMercadoPagoPreference(plan, user);

        // Registrar pagamento no banco
        const { data: payment, error } = await supabase
            .from('payments')
            .insert({
                user_id: user.id,
                plan_id: plan.id,
                amount: plan.price,
                currency: 'BRL',
                status: 'pending',
                payment_method: 'mercado_pago',
                mercado_pago_preference_id: preference.id,
                description: `Plano ${plan.display_name} - ${plan.name}`
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao registrar pagamento:', error);
            return res.status(500).json({ error: 'Failed to register payment' });
        }

        console.log('✅ Pagamento registrado:', payment.id);

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
        console.error('❌ Erro no endpoint:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Função unificada para criar preferência no Mercado Pago
async function createMercadoPagoPreference(plan, user) {
    const MERCADO_PAGO_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN;

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
        throw new Error('Token do Mercado Pago não configurado');
    }

    const userEmail = user.email || `${user.id}@buscabusca.com`;
    const userName = user.name || userEmail.split('@')[0];

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
            name: userName,
            email: userEmail
        },
        back_urls: {
            success: 'https://buscabusca.vercel.app/api/payments/success',
            failure: 'https://buscabusca.vercel.app/api/payments/failure',
            pending: 'https://buscabusca.vercel.app/api/payments/pending'
        },
        notification_url: 'https://buscabusca.vercel.app/api/webhook/test',
        external_reference: `plan_${plan.id}_user_${user.id}`,
        auto_return: 'approved',
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    console.log('📤 Criando preferência no Mercado Pago...');

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(preference)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro Mercado Pago: ${errorData.message || 'Erro desconhecido'}`);
    }

    const data = await response.json();
    console.log('✅ Preferência criada:', data.id);
    return data;
} 