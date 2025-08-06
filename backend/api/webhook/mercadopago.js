import { getPaymentStatus } from '../../lib/mercadoPago.js';
import { supabase } from '../../lib/supabase.js';

// Função para verificar se o downgrade é possível
async function checkDowngradePossibility(userId, newPlanId) {
    try {
        console.log('🔍 Verificando possibilidade de downgrade...');

        // Buscar o novo plano
        const { data: newPlan, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', newPlanId)
            .single();

        if (planError || !newPlan) {
            console.error('❌ Erro ao buscar novo plano:', planError);
            return { canDowngrade: false, message: 'Plano não encontrado' };
        }

        // Buscar anúncios ativos do usuário
        const { data: activeAds, error: adsError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (adsError) {
            console.error('❌ Erro ao buscar anúncios:', adsError);
            return { canDowngrade: false, message: 'Erro ao verificar anúncios' };
        }

        const currentAdsCount = activeAds?.length || 0;
        const newPlanLimit = newPlan.max_ads || 0;

        console.log(`📊 Anúncios atuais: ${currentAdsCount}, Limite do novo plano: ${newPlanLimit}`);

        // Verificar se excede o limite
        if (currentAdsCount > newPlanLimit) {
            const adsToDeactivate = currentAdsCount - newPlanLimit;
            const message = `Você tem ${currentAdsCount} anúncios ativos, mas o plano ${newPlan.display_name} permite apenas ${newPlanLimit}. Você precisa desativar ${adsToDeactivate} anúncio(s) antes de fazer o downgrade.`;

            console.log(`❌ Downgrade bloqueado: ${message}`);
            return {
                canDowngrade: false,
                message: message,
                currentAds: currentAdsCount,
                newPlanLimit: newPlanLimit,
                adsToDeactivate: adsToDeactivate
            };
        } else {
            console.log('✅ Downgrade permitido - anúncios dentro do limite');
            return { canDowngrade: true, message: 'Downgrade permitido' };
        }
    } catch (error) {
        console.error('❌ Erro na verificação de downgrade:', error);
        return { canDowngrade: false, message: 'Erro interno na verificação' };
    }
}

// Função para ativar assinatura do usuário
async function activateSubscription(userId, planId) {
    try {
        console.log('🔧 Ativando assinatura para usuário:', userId, 'plano:', planId);

        // Buscar plano atual do usuário
        const { data: currentSubscription, error: currentError } = await supabase
            .from('user_subscriptions')
            .select(`
                *,
                plans:plan_id (
                    id,
                    name,
                    max_ads
                )
            `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        let isDowngrade = false;
        let currentPlanMaxAds = 0;

        if (currentSubscription && currentSubscription.plans) {
            currentPlanMaxAds = currentSubscription.plans.max_ads || 0;
            console.log(`📊 Plano atual: ${currentSubscription.plans.name} (${currentPlanMaxAds} anúncios)`);
        }

        // Buscar novo plano
        const { data: newPlan, error: newPlanError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single();

        console.log('🔍 Novo plano: (mercadopago.js)', newPlan);

        if (newPlanError || !newPlan) {
            console.error('❌ Erro ao buscar novo plano:', newPlanError);
            throw newPlanError;
        }

        const newPlanMaxAds = newPlan.max_ads || 0;
        console.log(`📊 Novo plano: ${newPlan.name} (${newPlanMaxAds} anúncios)`);

        // Verificar se é downgrade
        if (currentPlanMaxAds > newPlanMaxAds) {
            isDowngrade = true;
            console.log('⚠️ DETECTADO DOWNGRADE! Verificando anúncios...');
        }

        // Primeiro, cancelar assinaturas ativas existentes
        const { error: cancelError } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'cancelled',
                end_date: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('status', 'active');

        if (cancelError) {
            console.error('❌ Erro ao cancelar assinaturas anteriores:', cancelError);
        } else {
            console.log('✅ Assinaturas anteriores canceladas');
        }


        // Criar nova assinatura ativa
        const { error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .insert({
                user_id: userId,
                plan_id: planId,
                status: 'active',
                start_date: new Date().toISOString(),
                end_date: null // Plano contínuo até cancelamento
            });

        if (subscriptionError) {
            console.error('❌ Erro ao criar assinatura:', subscriptionError);
            throw subscriptionError;
        } else {
            console.log('✅ Assinatura ativada com sucesso para usuário:', userId);
        }
    } catch (error) {
        console.error('❌ Erro na função activateSubscription:', error);
        throw error;
    }
}

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

            try {
                // Buscar o plano baseado no valor do pagamento
                const { data: planData, error: planError } = await supabase
                    .from('plans')
                    .select('*')
                    .eq('price', payment.amount)
                    .single();

                if (planError || !planData) {
                    console.error('❌ Erro ao buscar plano:', planError);
                    console.log('💰 Valor do pagamento:', payment.amount);

                    // Fallback: buscar plano pelo nome na descrição
                    const planNameMatch = payment.description.match(/plano (\w+)/i);
                    if (planNameMatch) {
                        const planName = planNameMatch[1].toLowerCase();
                        const { data: fallbackPlan, error: fallbackError } = await supabase
                            .from('plans')
                            .select('*')
                            .ilike('name', `%${planName}%`)
                            .single();

                        if (fallbackPlan) {
                            console.log('✅ Plano encontrado via fallback:', fallbackPlan.name);
                            await activateSubscription(payment.user_id, fallbackPlan.id);
                        } else {
                            console.error('❌ Plano não encontrado via fallback');
                        }
                    }
                } else {
                    console.log('✅ Plano encontrado:', planData.name);
                    await activateSubscription(payment.user_id, planData.id);
                }
            } catch (error) {
                console.error('❌ Erro ao processar assinatura:', error);

                // Se é erro de downgrade bloqueado, retornar erro específico
                if (error.message.includes('Você tem') && error.message.includes('anúncios ativos')) {
                    return res.status(400).json({
                        success: false,
                        error: 'downgrade_blocked',
                        message: error.message,
                        details: {
                            type: 'downgrade_blocked',
                            reason: 'too_many_active_ads'
                        }
                    });
                }

                // Para outros erros, continuar normalmente
                console.error('❌ Erro não relacionado ao downgrade:', error);
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