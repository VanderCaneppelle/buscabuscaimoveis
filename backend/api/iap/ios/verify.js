/**
 * POST /api/iap/ios/verify
 * Valida receipt da Apple e ativa plano ou boost
 */
import { supabase } from '../../../lib/supabase.js';

const APPLE_VERIFY_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { type, receipt, userId, planId, boostPlanId, propertyId, transactionId, productId } = req.body;

        if (!receipt || !userId) {
            return res.status(400).json({ error: 'receipt e userId são obrigatórios' });
        }
        if (type !== 'plan' && type !== 'boost') {
            return res.status(400).json({ error: 'type deve ser "plan" ou "boost"' });
        }
        if (type === 'plan' && !planId) {
            return res.status(400).json({ error: 'planId obrigatório para type=plan' });
        }
        if (type === 'boost' && (!boostPlanId || !propertyId)) {
            return res.status(400).json({ error: 'boostPlanId e propertyId obrigatórios para type=boost' });
        }

        const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET;
        if (!sharedSecret) {
            console.error('❌ APPLE_IAP_SHARED_SECRET não configurado');
            return res.status(500).json({ error: 'Configuração do servidor incompleta' });
        }

        // 1. Verificar receipt com Apple
        let result = await verifyWithApple(receipt, sharedSecret, APPLE_VERIFY_PRODUCTION);
        if (result.status === 21007) {
            result = await verifyWithApple(receipt, sharedSecret, APPLE_VERIFY_SANDBOX);
        }
        if (result.status !== 0) {
            console.error('❌ Apple verifyReceipt status:', result.status);
            return res.status(400).json({ error: 'Receipt inválido', status: result.status });
        }

        const receiptData = result.receipt || result;
        const inApp = receiptData.in_app || [];
        const txIdStr = transactionId ? String(transactionId) : null;
        const latestTx = inApp.find(
            (t) => (txIdStr && String(t.transaction_id) === txIdStr) || (productId && t.product_id === productId)
        ) || inApp[inApp.length - 1];

        if (!latestTx) {
            return res.status(400).json({ error: 'Transação não encontrada no receipt' });
        }

        const appleTransactionId = String(latestTx.transaction_id);
        const appleProductId = latestTx.product_id;

        // 2. Idempotência: já processamos esta transação?
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id')
            .eq('apple_transaction_id', appleTransactionId)
            .single();

        if (existingPayment) {
            console.log('✅ Transação já processada (idempotência):', appleTransactionId);
            return res.status(200).json({
                success: true,
                alreadyProcessed: true,
                paymentId: existingPayment.id,
            });
        }

        if (type === 'plan') {
            return await activatePlan(res, { userId, planId, appleTransactionId, appleProductId });
        }
        return await activateBoost(res, { userId, boostPlanId, propertyId, appleTransactionId, appleProductId });
    } catch (error) {
        console.error('❌ Erro verify IAP:', error);
        return res.status(500).json({ error: error?.message || 'Internal server error' });
    }
}

async function verifyWithApple(receipt, password, url) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'receipt-data': receipt, password }),
    });
    return res.json();
}

async function activatePlan(res, { userId, planId, appleTransactionId, appleProductId }) {
    const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError || !plan) {
        return res.status(400).json({ error: 'Plano não encontrado' });
    }

    const daysToAdd = plan.period === 'annual' ? 365 : 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysToAdd);

    const { data: payment, error: payError } = await supabase
        .from('payments')
        .insert({
            user_id: userId,
            plan_id: planId,
            amount: plan.price,
            currency: 'BRL',
            status: 'approved',
            payment_method: 'apple_iap',
            payment_source: 'apple_iap',
            apple_transaction_id: appleTransactionId,
            apple_product_id: appleProductId,
            description: `Plano ${plan.display_name || plan.name} - Apple IAP`,
        })
        .select()
        .single();

    if (payError) {
        console.error('❌ Erro ao criar payment:', payError);
        return res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }

    const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existingSub) {
        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update({
                plan_id: planId,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: endDate.toISOString(),
                payment_id: payment.id,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        if (updateError) {
            console.error('❌ Erro ao atualizar assinatura:', updateError);
            return res.status(500).json({ error: 'Erro ao ativar assinatura' });
        }
    } else {
        const { error: insertError } = await supabase.from('user_subscriptions').insert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            payment_id: payment.id,
        });
        if (insertError) {
            console.error('❌ Erro ao criar assinatura:', insertError);
            return res.status(500).json({ error: 'Erro ao ativar assinatura' });
        }
    }

    console.log('✅ Plano ativado via IAP:', plan.name, userId);
    return res.status(200).json({
        success: true,
        paymentId: payment.id,
        planId: plan.id,
    });
}

async function activateBoost(res, { userId, boostPlanId, propertyId, appleTransactionId, appleProductId }) {
    const { data: boostPlan, error: planError } = await supabase
        .from('boost_plans')
        .select('*')
        .eq('id', boostPlanId)
        .single();

    if (planError || !boostPlan) {
        return res.status(400).json({ error: 'Plano de boost não encontrado' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + boostPlan.duration_days);

    // Cancelar boosts ativos anteriores do mesmo imóvel
    await supabase
        .from('property_boosts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('property_id', propertyId)
        .eq('status', 'active');

    const { data: payment, error: payError } = await supabase
        .from('payments')
        .insert({
            user_id: userId,
            amount: boostPlan.price,
            currency: 'BRL',
            status: 'approved',
            payment_method: 'apple_iap',
            payment_source: 'apple_iap',
            apple_transaction_id: appleTransactionId,
            apple_product_id: appleProductId,
            description: `Boost ${boostPlan.duration_days} dias - Apple IAP`,
        })
        .select()
        .single();

    if (payError) {
        console.error('❌ Erro ao criar payment boost:', payError);
        return res.status(500).json({ error: 'Erro ao registrar pagamento' });
    }

    const { data: boost, error: boostError } = await supabase
        .from('property_boosts')
        .insert({
            property_id: propertyId,
            user_id: userId,
            end_date: endDate.toISOString(),
            duration_days: boostPlan.duration_days,
            status: 'active',
            payment_id: payment.id,
            amount: boostPlan.price,
        })
        .select()
        .single();

    if (boostError) {
        console.error('❌ Erro ao criar boost:', boostError);
        return res.status(500).json({ error: 'Erro ao ativar boost' });
    }

    console.log('✅ Boost ativado via IAP:', boostPlan.duration_days, 'dias', propertyId);
    return res.status(200).json({
        success: true,
        paymentId: payment.id,
        boostId: boost.id,
    });
}
