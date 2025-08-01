import { supabase } from './supabase';

export class PlanService {
    // Verificar se usuário pode criar anúncio
    static async canUserCreateAd(userId) {
        try {
            const { data, error } = await supabase
                .rpc('can_user_create_ad', { user_uuid: userId });

            if (error) throw error;

            return data[0] || {
                can_create: false,
                reason: 'Erro ao verificar permissões',
                current_ads: 0,
                max_ads: 0,
                plan_name: 'Desconhecido'
            };
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            return {
                can_create: false,
                reason: 'Erro ao verificar permissões',
                current_ads: 0,
                max_ads: 0,
                plan_name: 'Desconhecido'
            };
        }
    }

    // Obter plano ativo do usuário
    static async getUserActivePlan(userId) {
        try {
            const { data, error } = await supabase
                .rpc('get_user_active_plan', { user_uuid: userId });

            if (error) throw error;

            return data[0] || null;
        } catch (error) {
            console.error('Erro ao obter plano ativo:', error);
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
                .order('price', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter planos:', error);
            return [];
        }
    }

    // Contratar/alterar plano
    static async subscribeToPlan(userId, planName, durationMonths = 1) {
        try {
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

    // Associar usuário ao plano gratuito
    static async assignFreePlan(userId) {
        try {
            const { data, error } = await supabase
                .rpc('assign_free_plan_to_user', { user_uuid: userId });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao associar plano gratuito:', error);
            return false;
        }
    }

    // Obter informações completas do usuário (plano + anúncios)
    static async getUserPlanInfo(userId) {
        try {
            const [planData, canCreateData] = await Promise.all([
                this.getUserActivePlan(userId),
                this.canUserCreateAd(userId)
            ]);

            return {
                plan: planData,
                canCreate: canCreateData,
                isFreePlan: planData?.plan_name === 'free',
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