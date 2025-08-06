import { createPaymentPreference } from '../../lib/mercadoPago.js';
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
        console.log('🔍 Novo plano: (create.js)', newPlan);

        if (planError || !newPlan) {
            console.error('❌ Erro ao buscar novo plano:', planError);
            return { canDowngrade: false, message: 'Plano não encontrado' };
        }

        // Buscar anúncios do usuário (approved, pending, active - todos que não estão deletados)
        const { data: activeAds, error: adsError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['approved', 'pending'])
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

        console.log('📦 User object received by create.js:', JSON.stringify(user)); // Added for debugging

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

        // Verificar se é downgrade ANTES de criar a preferência
        try {
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
                .eq('user_id', user.id)
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
                .eq('id', plan.id)
                .single();

            if (newPlanError || !newPlan) {
                console.error('❌ Erro ao buscar novo plano:', newPlanError);
                return res.status(400).json({ error: 'Plano não encontrado' });
            }

            const newPlanMaxAds = newPlan.max_ads || 0;
            console.log(`📊 Novo plano: ${newPlan.name} (${newPlanMaxAds} anúncios)`);

            // Verificar se é downgrade
            if (currentPlanMaxAds > newPlanMaxAds) {
                isDowngrade = true;
                console.log('⚠️ DETECTADO DOWNGRADE! Verificando anúncios...');

                // Verificar se o downgrade é possível
                const downgradeCheck = await checkDowngradePossibility(user.id, plan.id);

                if (!downgradeCheck.canDowngrade) {
                    console.log('❌ Downgrade bloqueado:', downgradeCheck.message);
                    return res.status(400).json({
                        success: false,
                        error: 'downgrade_blocked',
                        message: downgradeCheck.message,
                        details: {
                            type: 'downgrade_blocked',
                            reason: 'too_many_active_ads',
                            currentAds: downgradeCheck.currentAds,
                            newPlanLimit: downgradeCheck.newPlanLimit,
                            adsToDeactivate: downgradeCheck.adsToDeactivate
                        }
                    });
                }

                console.log('✅ Downgrade permitido:', downgradeCheck.message);
            }
        } catch (error) {
            console.error('❌ Erro na verificação de downgrade:', error);
            // Se der erro na verificação, permitir continuar (fail-safe)
        }

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