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
        const { property, boostPlan, user } = req.body;

        console.log('📦 Dados recebidos para boost:', {
            property: property?.title,
            boostPlan: boostPlan?.name,
            duration: boostPlan?.duration_days,
            user: user?.email
        });

        if (!property || !boostPlan || !user) {
            return res.status(400).json({ error: 'Property, boostPlan and user are required' });
        }

        // Criar preferência no Mercado Pago
        const preference = await createBoostMercadoPagoPreference(property, boostPlan, user);

        // Criar registro de boost pendente no banco
        const { data: boost, error: boostError } = await supabase
            .from('property_boosts')
            .insert({
                property_id: property.id,
                user_id: user.id,
                end_date: new Date(Date.now() + boostPlan.duration_days * 24 * 60 * 60 * 1000).toISOString(),
                duration_days: boostPlan.duration_days,
                status: 'pending',
                amount: boostPlan.price
            })
            .select()
            .single();

        if (boostError) {
            console.error('❌ Erro ao criar boost:', boostError);
            return res.status(500).json({ error: 'Failed to create boost' });
        }

        // Registrar pagamento no banco
        const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
                user_id: user.id,
                amount: boostPlan.price,
                currency: 'BRL',
                status: 'pending',
                payment_method: 'mercado_pago',
                mercado_pago_preference_id: preference.id,
                description: `Impulsionamento - ${property.title} - ${boostPlan.duration_days} dias`
            })
            .select()
            .single();

        if (paymentError) {
            console.error('❌ Erro ao registrar pagamento:', paymentError);
            return res.status(500).json({ error: 'Failed to register payment' });
        }

        // Atualizar boost com payment_id
        await supabase
            .from('property_boosts')
            .update({ payment_id: payment.id })
            .eq('id', boost.id);

        console.log('✅ Boost e pagamento criados:', { boost: boost.id, payment: payment.id });

        return res.status(200).json({
            success: true,
            preference: {
                id: preference.id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point
            },
            boost: {
                id: boost.id,
                status: boost.status
            },
            payment: {
                id: payment.id,
                status: payment.status
            }
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de boost:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Função para criar preferência no Mercado Pago para boost
async function createBoostMercadoPagoPreference(property, boostPlan, user) {
    const MERCADO_PAGO_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN;
    const BASE_URL = process.env.API_BASE_URL;  // https://buscabusca.vercel.app

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
        throw new Error('Token do Mercado Pago não configurado');
    }

    const userEmail = user.email || `${user.id}@buscabusca.com`;
    const userName = user.name || userEmail.split('@')[0];

    const preference = {
        items: [
            {
                title: `Impulsionamento - ${property.title}`,
                description: `Destaque por ${boostPlan.duration_days} ${boostPlan.duration_days === 1 ? 'dia' : 'dias'}`,
                unit_price: boostPlan.price,
                quantity: 1,
                currency_id: 'BRL'
            }
        ],
        payer: {
            name: userName,
            email: userEmail
        },
        back_urls: {
            success: `${BASE_URL}/api/payments/success`,
            failure: `${BASE_URL}/api/payments/failure`,
            pending: `${BASE_URL}/api/payments/pending`
        },
        notification_url: `${BASE_URL}/api/webhook/mercadopago`,
        external_reference: `boost_${property.id}_user_${user.id}_days_${boostPlan.duration_days}`,
        auto_return: 'approved',
        expires: true,
        expiration_date_to: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    console.log('📤 Criando preferência de boost no Mercado Pago...');

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
    console.log('✅ Preferência de boost criada:', data.id);
    return data;
}

