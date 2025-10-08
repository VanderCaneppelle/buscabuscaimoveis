import { supabase } from './supabase';

export class PlanService {
    // Verificar se usuário pode criar anúncio
    static async canUserCreateAd(userId) {
        try {
            console.log('🔍 Chamando can_user_create_ad para userId:', userId);

            const { data, error } = await supabase
                .rpc('can_user_create_ad', { user_uuid: userId });

            console.log('📥 Resposta can_user_create_ad - data:', data);
            console.log('📥 Resposta can_user_create_ad - error:', error);

            if (error) {
                console.error('❌ Erro na RPC can_user_create_ad:', error);
                throw error;
            }

            // A RPC pode retornar um array ou um objeto direto
            let result;
            if (Array.isArray(data) && data.length > 0) {
                result = data[0];
            } else if (data && typeof data === 'object') {
                result = data;
            } else {
                result = {
                    can_create: false,
                    reason: 'Nenhum dado retornado',
                    current_ads: 0,
                    max_ads: 0,
                    plan_name: 'Desconhecido'
                };
            }

            console.log('✅ Resultado final can_user_create_ad:', result);
            return result;
        } catch (error) {
            console.error('❌ Erro ao verificar permissões:', error);
            return {
                can_create: false,
                reason: 'Erro ao verificar permissões',
                current_ads: 0,
                max_ads: 0,
                plan_name: 'Desconhecido'
            };
        }
    }

    // Obter plano ativo do usuário (incluindo verificação de expiração)
    static async getUserActivePlan(userId) {
        try {
            console.log('🔍 Chamando get_user_active_plan para userId:', userId);

            const { data, error } = await supabase
                .rpc('get_user_active_plan', { user_uuid: userId });

            console.log('📥 Resposta get_user_active_plan - data:', data);
            console.log('📥 Resposta get_user_active_plan - error:', error);

            if (error) {
                console.error('❌ Erro na RPC get_user_active_plan:', error);
                throw error;
            }

            // A RPC pode retornar um array ou um objeto direto
            let result;
            if (Array.isArray(data) && data.length > 0) {
                result = data[0];
                console.log('✅ RPC retornou data[0]:', result);
            } else if (data && typeof data === 'object' && !Array.isArray(data)) {
                result = data;
                console.log('✅ RPC retornou data direto:', result);
            } else {
                // Fallback: buscar direto da tabela (incluindo planos expirados)
                console.log('⚠️ RPC retornou vazio, buscando última assinatura...');

                const { data: directData, error: directError } = await supabase
                    .from('user_subscriptions')
                    .select(`
                        *,
                        plans (
                            id,
                            name,
                            display_name,
                            max_ads,
                            price,
                            features
                        )
                    `)
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (directError) {
                    console.log('⚠️ Nenhuma assinatura encontrada:', directError);
                    result = null;
                } else {
                    const isExpired = directData.end_date && new Date(directData.end_date) < new Date();
                    console.log('📅 Verificação de expiração:', {
                        end_date: directData.end_date,
                        now: new Date().toISOString(),
                        isExpired
                    });

                    if (isExpired) {
                        // Plano expirado - retornar com flag especial
                        result = {
                            ...directData.plans,
                            is_expired: true,
                            end_date: directData.end_date
                        };
                        console.log('⏰ Plano EXPIRADO encontrado:', result);
                    } else {
                        result = directData?.plans;
                        console.log('✅ Plano ATIVO encontrado:', result);
                    }
                }
            }

            return result;
        } catch (error) {
            console.error('❌ Erro ao obter plano ativo:', error);
            return null;
        }
    }

    // Obter todos os planos disponíveis
    static async getAvailablePlans() {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .order('period', { ascending: true })
                .order('price', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter planos:', error);
            return [];
        }
    }

    // Snapshot centralizado do plano do usuário (estável e confiável)
    // Retorna dados do plano + metadados da assinatura e validade
    static async getUserPlanSnapshot(userId) {
        try {
            // Buscar a última assinatura com status 'active' (mesmo que esteja expirada)
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select(`
                    id,
                    status,
                    start_date,
                    end_date,
                    created_at,
                    plans (
                        id,
                        name,
                        display_name,
                        max_ads,
                        period,
                        price,
                        features
                    )
                `)
                .eq('user_id', userId)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                // PGRST116 = nenhum registro
                if (error.code === 'PGRST116') {
                    return {
                        plan: null,
                        subscription: null,
                        hasActivePlan: false,
                        isFreePlan: true,
                        isExpired: false,
                    };
                }
                throw error;
            }

            const plan = data?.plans || null;
            const endDateIso = data?.end_date || null;
            const isExpired = !!endDateIso && new Date(endDateIso) <= new Date();


            return {
                plan,
                subscription: {
                    id: data?.id,
                    status: data?.status,
                    start_date: data?.start_date,
                    end_date: endDateIso,
                },
                hasActivePlan: !!plan,
                isFreePlan: plan?.name === 'free',
                isExpired,
            };
        } catch (err) {
            console.error('Erro em getUserPlanSnapshot:', err);
            return {
                plan: null,
                subscription: null,
                hasActivePlan: false,
                isFreePlan: true,
                isExpired: false,
            };
        }
    }

    // Contagem de anúncios do usuário por status (approved, pending, rejected)
    static async getUserAdCounts(userId) {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('status', { count: 'exact' })
                .eq('user_id', userId)
                .in('status', ['approved', 'pending', 'rejected']);

            if (error) throw error;

            // data pode vir como linhas sem agregação; computar manualmente
            const counts = { approved: 0, pending: 0, rejected: 0 };
            (data || []).forEach((row) => {
                const key = row.status;
                if (key in counts) counts[key] += 1;
            });
            const total = counts.approved + counts.pending + counts.rejected;

            return { ...counts, total };
        } catch (err) {
            console.error('Erro em getUserAdCounts:', err);
            return { approved: 0, pending: 0, rejected: 0, total: 0 };
        }
    }

    static async userCanManageAds(userId) {
        try {
            const snapshot = await this.getUserPlanSnapshot(userId);
            const userAdCounts = await this.getUserAdCounts(userId);

            let canManageAds = false;
            let reason = '';

            // Permitir gerenciar se:
            // 1. Tem plano pago (não free)
            // 2. Plano NÃO está vencido
            // 3. Tem pelo menos 1 anúncio criado
            // (Permite gerenciar mesmo com limite atingido para poder excluir)

            const isFreePlan = !snapshot.plan || snapshot.plan.name === 'free';
            const hasAds = userAdCounts.total > 0;

            if (isFreePlan) {
                canManageAds = false;
                reason = 'Plano gratuito não permite gerenciar anúncios';
            } else if (snapshot.isExpired) {
                canManageAds = false;
                reason = 'Plano vencido. Renove para gerenciar seus anúncios';
            } else if (!hasAds) {
                canManageAds = false;
                reason = 'Você ainda não tem anúncios para gerenciar';
            } else {
                // Tem plano pago + NÃO vencido + tem anúncios -> PODE gerenciar
                // (mesmo que limite esteja atingido)
                canManageAds = true;
                reason = 'Pode gerenciar anúncios';
            }

            return {
                canManageAds,
                reason,
                hasAds,
                isFreePlan,
                isExpired: snapshot.isExpired,
            };
        } catch (err) {
            console.error('Erro em userCanManageAds:', err);
            return {
                canManageAds: false,
                reason: 'Erro ao verificar permissões',
            };
        }
    }

    // Elegibilidade centralizada: plano + validade + limites
    // Governa botões, mensagens e fluxos
    static async getUserEligibility(userId) {
        try {
            const [snapshot, adCounts] = await Promise.all([
                this.getUserPlanSnapshot(userId),
                this.getUserAdCounts(userId),
            ]);

            const plan = snapshot.plan;
            const maxAds = plan?.max_ads ?? 0;
            const isFreePlan = plan?.name === 'free';
            const isExpired = snapshot.isExpired && !isFreePlan; // free não expira

            // Regras:
            // - Plano gratuito (max_ads geralmente 0) => não pode criar
            // - Plano pago expirado => não pode criar
            // - Caso contrário, pode criar se total < max_ads
            let canCreate = false;
            let reason = '';

            if (!plan) {
                canCreate = false;
                reason = 'Nenhum plano ativo';
            } else if (isFreePlan) {
                canCreate = adCounts.total < maxAds;
                reason = canCreate
                    ? 'Pode criar anúncio'
                    : 'Plano gratuito não permite criar anúncios';
            } else if (isExpired) {
                canCreate = false;
                reason = 'Plano vencido — renove para criar anúncios';
            } else {
                canCreate = adCounts.total < maxAds;
                reason = canCreate
                    ? 'Pode criar anúncio'
                    : 'Limite de anúncios atingido';
            }

            return {
                planName: plan?.name || 'free',
                planDisplayName: plan?.display_name || 'Gratuito',
                maxAds,
                isFreePlan,
                isExpired,
                endDate: snapshot.subscription?.end_date || null,
                currentAds: adCounts.total,
                counts: adCounts,
                canCreate,
                reason,
            };
        } catch (err) {
            console.error('Erro em getUserEligibility:', err);
            return {
                planName: 'free',
                planDisplayName: 'Gratuito',
                maxAds: 0,
                isFreePlan: true,
                isExpired: false,
                endDate: null,
                currentAds: 0,
                counts: { approved: 0, pending: 0, rejected: 0, total: 0 },
                canCreate: false,
                reason: 'Erro ao verificar permissões',
            };
        }
    }

    // Obter planos agrupados por período (mensal/anual)
    static async getPlansGroupedByPeriod() {
        try {
            const plans = await this.getAvailablePlans();

            const grouped = {
                monthly: [],
                annual: []
            };

            plans.forEach(plan => {
                if (plan.period === 'annual') {
                    grouped.annual.push(plan);
                } else {
                    grouped.monthly.push(plan);
                }
            });

            return grouped;
        } catch (error) {
            console.error('Erro ao agrupar planos por período:', error);
            return { monthly: [], annual: [] };
        }
    }

    // Obter um plano pelo nome (inclui limites max_images e max_videos)
    static async getPlanByName(planName) {
        try {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('name', planName)
                .single();

            if (error) throw error;

            return data || null;
        } catch (error) {
            console.error('Erro ao obter plano por nome:', error);
            return null;
        }
    }

    // Contratar/alterar plano
    static async subscribeToPlan(userId, planName, durationMonths = null) {
        try {
            // Se durationMonths não foi especificado, determinar baseado no período do plano
            if (durationMonths === null) {
                const plan = await this.getPlanByName(planName);
                if (plan) {
                    durationMonths = plan.period === 'annual' ? 12 : 1;
                } else {
                    durationMonths = 1; // fallback
                }
            }

            const { data, error } = await supabase
                .rpc('subscribe_user_to_plan', {
                    user_uuid: userId,
                    plan_name: planName,
                    duration_months: durationMonths
                });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao contratar plano:', error);
            return false;
        }
    }

    // // Associar usuário ao plano gratuito
    // static async assignFreePlan(userId) {
    //     try {
    //         const { data, error } = await supabase
    //             .rpc('assign_free_plan_to_user', { user_uuid: userId });

    //         if (error) throw error;

    //         return data;
    //     } catch (error) {
    //         console.error('Erro ao associar plano gratuito:', error);
    //         return false;
    //     }
    // }

    // Obter informações completas do usuário (plano + anúncios)
    static async getUserPlanInfo(userId) {
        try {
            const [planData, canCreateData] = await Promise.all([
                this.getUserActivePlan(userId),
                this.canUserCreateAd(userId)
            ]);

            console.log('📊 getUserPlanInfo - planData:', planData);
            console.log('📊 getUserPlanInfo - canCreateData:', canCreateData);

            return {
                plan: planData,
                canCreate: canCreateData,
                isFreePlan: planData?.name === 'free',
                hasActivePlan: !!planData
            };
        } catch (error) {
            console.error('Erro ao obter informações do plano:', error);
            return {
                plan: null,
                canCreate: { can_create: false, reason: 'Erro ao verificar' },
                isFreePlan: true,
                hasActivePlan: false
            };
        }
    }

    // Obter histórico de assinaturas do usuário
    static async getUserSubscriptionHistory(userId) {
        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select(`
                    *,
                    plans (
                        name,
                        display_name,
                        price
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter histórico de assinaturas:', error);
            return [];
        }
    }
} 