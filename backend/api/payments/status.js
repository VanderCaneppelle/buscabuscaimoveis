import { getPaymentStatus } from '../../lib/mercadoPago.js';
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
        const { paymentId } = req.query;

        if (!paymentId) {
            return res.status(400).json({ error: 'Payment ID is required' });
        }

        console.log('🔍 Verificando status do pagamento:', paymentId);

        // Buscar pagamento no Mercado Pago
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

        const payment = await response.json();
        console.log('📊 Status do pagamento:', payment.status);

        return res.status(200).json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                preference_id: payment.preference_id,
                external_reference: payment.external_reference
            }
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 