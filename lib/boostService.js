import { supabase } from './supabase';

export class BoostService {
    // Obter planos de boost disponíveis
    static async getBoostPlans() {
        try {
            const { data, error } = await supabase
                .from('boost_plans')
                .select('*')
                .eq('is_active', true)
                .order('duration_days', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter planos de boost:', error);
            return [];
        }
    }

    // Verificar se anúncio tem boost ativo
    static async hasActiveBoost(propertyId) {
        try {
            const { data, error } = await supabase
                .rpc('has_active_boost', { property_uuid: propertyId });

            if (error) throw error;

            return data || false;
        } catch (error) {
            console.error('Erro ao verificar boost ativo:', error);
            return false;
        }
    }

    // Obter boost ativo de um anúncio
    static async getActiveBoost(propertyId) {
        try {
            const { data, error } = await supabase
                .rpc('get_active_boost', { property_uuid: propertyId });

            if (error) throw error;

            return data?.[0] || null;
        } catch (error) {
            console.error('Erro ao obter boost ativo:', error);
            return null;
        }
    }

    // Criar boost (retorna ID do boost criado)
    static async createBoost(propertyId, userId, planName, paymentId = null) {
        try {
            const { data, error } = await supabase
                .rpc('create_boost', {
                    property_uuid: propertyId,
                    user_uuid: userId,
                    plan_name: planName,
                    payment_uuid: paymentId
                });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao criar boost:', error);
            throw error;
        }
    }

    // Ativar boost após pagamento
    static async activateBoost(boostId) {
        try {
            const { data, error } = await supabase
                .rpc('activate_boost', { boost_uuid: boostId });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao ativar boost:', error);
            return false;
        }
    }

    // Obter histórico de boosts do usuário
    static async getUserBoosts(userId) {
        try {
            const { data, error } = await supabase
                .from('property_boosts')
                .select(`
                    *,
                    properties (
                        id,
                        title,
                        city,
                        state,
                        images
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter histórico de boosts:', error);
            return [];
        }
    }

    // Obter boosts de um anúncio específico
    static async getPropertyBoosts(propertyId) {
        try {
            const { data, error } = await supabase
                .from('property_boosts')
                .select('*')
                .eq('property_id', propertyId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter boosts do anúncio:', error);
            return [];
        }
    }

    // Cancelar boost ativo
    static async cancelBoost(boostId) {
        try {
            const { error } = await supabase
                .from('property_boosts')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', boostId)
                .eq('status', 'active');

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Erro ao cancelar boost:', error);
            return false;
        }
    }

    // Obter anúncios em destaque (boosted) - Dados completos
    static async getBoostedProperties() {
        try {
            const { data, error } = await supabase
                .rpc('get_boosted_properties');

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao obter anúncios em destaque:', error);
            return [];
        }
    }

    // Obter apenas IDs de propriedades impulsionadas (otimizado para badges)
    static async getBoostedPropertyIds(propertyIds = null) {
        try {
            let query = supabase
                .from('property_boosts')
                .select('property_id')
                .eq('status', 'active')
                .gte('end_date', new Date().toISOString());

            // Se fornecido array de IDs, filtrar apenas esses
            if (propertyIds && propertyIds.length > 0) {
                query = query.in('property_id', propertyIds);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Retornar Set de IDs para verificação O(1)
            return new Set((data || []).map(boost => boost.property_id));
        } catch (error) {
            console.error('Erro ao obter IDs de propriedades impulsionadas:', error);
            return new Set();
        }
    }

    // Verificar se usuário pode impulsionar anúncio
    static async canBoostProperty(propertyId, userId) {
        try {
            // Verificar se o anúncio existe e está aprovado
            const { data: property, error: propertyError } = await supabase
                .from('properties')
                .select('id, user_id, status')
                .eq('id', propertyId)
                .single();

            if (propertyError || !property) {
                return {
                    can_boost: false,
                    reason: 'Anúncio não encontrado'
                };
            }

            if (property.user_id !== userId) {
                return {
                    can_boost: false,
                    reason: 'Este anúncio não pertence a você'
                };
            }

            if (property.status !== 'approved') {
                return {
                    can_boost: false,
                    reason: 'Apenas anúncios aprovados podem ser impulsionados'
                };
            }

            // Verificar se já tem boost ativo
            const hasBoost = await this.hasActiveBoost(propertyId);
            if (hasBoost) {
                return {
                    can_boost: false,
                    reason: 'Este anúncio já está impulsionado'
                };
            }

            return {
                can_boost: true,
                reason: 'Pode impulsionar'
            };
        } catch (error) {
            console.error('Erro ao verificar se pode impulsionar:', error);
            return {
                can_boost: false,
                reason: 'Erro ao verificar permissões'
            };
        }
    }

    // Calcular dias restantes de um boost
    static calculateDaysRemaining(endDate) {
        try {
            const end = new Date(endDate);
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return Math.max(0, diffDays);
        } catch (error) {
            console.error('Erro ao calcular dias restantes:', error);
            return 0;
        }
    }

    // Formatar data de expiração do boost
    static formatBoostExpiration(endDate) {
        try {
            const daysRemaining = this.calculateDaysRemaining(endDate);

            if (daysRemaining === 0) {
                return 'Expira hoje';
            } else if (daysRemaining === 1) {
                return 'Expira amanhã';
            } else {
                return `${daysRemaining} dias restantes`;
            }
        } catch (error) {
            console.error('Erro ao formatar expiração:', error);
            return 'Expirado';
        }
    }
}

export default BoostService;

