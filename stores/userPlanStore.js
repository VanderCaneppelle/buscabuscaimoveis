import { create } from 'zustand';
import { PlanService } from '../lib/planService';

/**
 * Store de Plano do Usuário usando Zustand
 * Centraliza TODAS as informações sobre plano, anúncios e permissões do usuário
 * 
 * Features:
 * - Cache inteligente (3 minutos)
 * - Sincronização automática entre todas as telas
 * - Atualização otimista após ações
 * - Performance O(1) para verificações
 * 
 * Substitui múltiplas chamadas duplicadas:
 * - PlanService.getUserEligibility() (usado em 4+ telas)
 * - PlanService.userCanManageAds() (usado em 3+ telas)
 * - PlanService.getUserPlanInfo() (usado em 2+ telas)
 * - PlanService.getUserActivePlan() (usado em 2+ telas)
 */
export const useUserPlanStore = create((set, get) => ({
    // ========== ESTADO ==========

    // Dados do plano atual
    plan: null,                    // { id, name, display_name, max_ads, period, ... }
    planStatus: null,              // 'active', 'expired', 'cancelled', 'free'
    planEndDate: null,             // Data de expiração
    daysRemaining: null,           // Dias até expirar
    isFreePlan: false,             // Se é plano gratuito
    isPlanExpired: false,          // Se o plano está vencido

    // Dados de anúncios
    currentAds: 0,                 // Quantidade de anúncios ativos
    maxAds: 0,                     // Limite de anúncios do plano
    availableAds: 0,               // Anúncios disponíveis (maxAds - currentAds)
    inactiveAds: 0,                // Quantidade de anúncios inativos

    // Permissões calculadas
    canCreateAd: false,            // Pode criar novo anúncio?
    canManageAds: false,           // Pode gerenciar anúncios existentes?
    canBoostAd: false,             // Pode impulsionar anúncios?

    // Razões (para mensagens ao usuário)
    createAdReason: '',            // Por que não pode criar?
    manageAdsReason: '',           // Por que não pode gerenciar?
    boostAdReason: '',             // Por que não pode impulsionar?

    // Controle
    lastFetch: null,               // Timestamp da última busca
    loading: false,                // Estado de carregamento
    error: null,                   // Último erro
    userId: null,                  // ID do usuário atual

    // ========== AÇÕES ==========

    /**
     * Buscar e atualizar TODAS as informações do usuário
     * @param {string} userId - ID do usuário
     * @param {boolean} forceRefresh - Forçar busca ignorando cache
     * @returns {Object} Dados completos do usuário
     */
    fetchUserPlanData: async (userId, forceRefresh = false) => {
        const { lastFetch, userId: currentUserId } = get();
        const now = Date.now();
        const CACHE_TIME = 3 * 60 * 1000; // 3 minutos

        // Se mudou de usuário, forçar refresh
        if (currentUserId !== userId) {
            console.log('[UserPlanStore] 🔄 Usuário mudou, forçando refresh');
            forceRefresh = true;
        }

        // Cache: não buscar se já temos dados recentes
        if (!forceRefresh && lastFetch && (now - lastFetch) < CACHE_TIME && currentUserId === userId) {
            console.log('[UserPlanStore] 📦 Usando cache de dados do usuário');
            return get();
        }

        console.log('[UserPlanStore] 🔄 Buscando dados do usuário do servidor...');
        set({ loading: true, error: null, userId });

        try {
            // Buscar dados em paralelo (mais rápido)
            const [eligibility, manageInfo, snapshot] = await Promise.all([
                PlanService.getUserEligibility(userId),
                PlanService.userCanManageAds(userId),
                PlanService.getUserPlanSnapshot(userId) // ✅ Buscar snapshot para ter plano completo
            ]);

            // Calcular availableAds
            const calculatedAvailableAds = Math.max(0, eligibility.maxAds - eligibility.currentAds);

            console.log('[UserPlanStore] ✅ Dados carregados:', {
                planName: eligibility.planName,
                planDisplayName: eligibility.planDisplayName,
                snapshotPlan: snapshot.plan,
                 maxImages: snapshot.plan?.max_images,
                maxVideos: snapshot.plan?.max_videos,
                currentAds: eligibility.currentAds,
                maxAds: eligibility.maxAds,
                availableAds: calculatedAvailableAds,
                isFreePlan: eligibility.isFreePlan,
                isExpired: eligibility.isExpired,
                status: eligibility.status,
                canCreate: eligibility.canCreate,
                canManage: manageInfo.canManageAds
            });

            // Calcular permissão de boost (usuário com plano pago pode impulsionar)
            const canBoostAd = !eligibility.isFreePlan && !eligibility.isExpired;
            const boostAdReason = eligibility.isFreePlan
                ? 'Você precisa de um plano pago para impulsionar anúncios'
                : eligibility.isExpired
                    ? 'Seu plano está vencido. Renove para impulsionar anúncios'
                    : '';

            console.log('[UserPlanStore] 🎯 Cálculo de boost:', {
                isFreePlan: eligibility.isFreePlan,
                isExpired: eligibility.isExpired,
                canBoostAd,
                boostAdReason
            });

            // Atualizar store com TODOS os dados
            // ✅ Usar snapshot.plan (objeto completo) e sobrescrever campos básicos
            set({
                // Plano (mesclar snapshot.plan com dados do eligibility)
                plan: {
                    ...(snapshot.plan || {}), // Plano completo (max_images, max_videos, etc)
                    name: eligibility.planName,
                    display_name: eligibility.planDisplayName,
                    max_ads: eligibility.maxAds
                },
                planStatus: snapshot.subscription?.status || 'free', // ✅ Status do snapshot
                planEndDate: eligibility.endDate,
                daysRemaining: snapshot.daysRemaining || 0,
                isFreePlan: eligibility.isFreePlan,
                isPlanExpired: eligibility.isExpired,

                // Anúncios
                currentAds: eligibility.currentAds,
                maxAds: eligibility.maxAds,
                availableAds: Math.max(0, eligibility.maxAds - eligibility.currentAds), // ✅ Calcular
                inactiveAds: eligibility.inactiveAds || 0,

                // Permissões
                canCreateAd: eligibility.canCreate,
                canManageAds: manageInfo.canManageAds,
                canBoostAd: canBoostAd,

                // Razões
                createAdReason: eligibility.reason,
                manageAdsReason: manageInfo.reason,
                boostAdReason: boostAdReason,

                // Controle
                lastFetch: now,
                loading: false,
                error: null
            });

            return get();
        } catch (error) {
            console.error('[UserPlanStore] ❌ Erro ao buscar dados:', error);
            set({
                error: error.message,
                loading: false
            });
            throw error;
        }
    },

    /**
     * Atualizar contador de anúncios (após criar/deletar)
     * Atualização otimista - não espera o servidor
     * @param {number} delta - Quantidade a adicionar/remover (+1 ou -1)
     */
    updateAdCount: (delta) => {
        const { currentAds, maxAds } = get();
        const newCurrentAds = Math.max(0, currentAds + delta);
        const newAvailableAds = Math.max(0, maxAds - newCurrentAds);
        const newCanCreateAd = newAvailableAds > 0;

        set({
            currentAds: newCurrentAds,
            availableAds: newAvailableAds,
            canCreateAd: newCanCreateAd,
            createAdReason: newCanCreateAd ? '' : 'Você atingiu o limite de anúncios do seu plano'
        });

        console.log('[UserPlanStore] 📊 Contador atualizado:', {
            currentAds: newCurrentAds,
            availableAds: newAvailableAds,
            canCreate: newCanCreateAd
        });
    },

    /**
     * Incrementar contador de anúncios (após criar anúncio)
     */
    incrementAdCount: () => {
        get().updateAdCount(1);
    },

    /**
     * Decrementar contador de anúncios (após deletar anúncio)
     */
    decrementAdCount: () => {
        get().updateAdCount(-1);
    },

    /**
     * Atualizar status do plano (após contratar/renovar)
     * @param {Object} newPlanData - Novos dados do plano
     */
    updatePlanStatus: (newPlanData) => {
        console.log('[UserPlanStore] 🔄 Atualizando status do plano:', newPlanData);

        set({
            plan: newPlanData.plan || get().plan,
            planStatus: newPlanData.status || get().planStatus,
            planEndDate: newPlanData.endDate || get().planEndDate,
            daysRemaining: newPlanData.daysRemaining || get().daysRemaining,
            isFreePlan: newPlanData.isFreePlan ?? get().isFreePlan,
            isPlanExpired: newPlanData.isExpired ?? get().isPlanExpired,
            maxAds: newPlanData.maxAds || get().maxAds,
            availableAds: newPlanData.maxAds ? newPlanData.maxAds - get().currentAds : get().availableAds,
            canBoostAd: !newPlanData.isFreePlan && !newPlanData.isExpired,
            lastFetch: null // Invalidar cache para próxima busca
        });
    },

    /**
     * Invalidar cache (forçar próxima busca)
     * Útil após ações importantes (criar anúncio, contratar plano, etc)
     */
    invalidateCache: () => {
        set({ lastFetch: null });
        console.log('[UserPlanStore] 🔄 Cache invalidado - próxima busca será do servidor');
    },

    /**
     * Refresh manual (força nova busca)
     * Útil para pull-to-refresh
     */
    refresh: async (userId) => {
        console.log('[UserPlanStore] 🔄 Refresh manual iniciado');
        return await get().fetchUserPlanData(userId, true);
    },

    /**
     * Resetar store (útil para logout)
     */
    reset: () => {
        console.log('[UserPlanStore] 🔄 Resetando store');
        set({
            plan: null,
            planStatus: null,
            planEndDate: null,
            daysRemaining: null,
            isFreePlan: false,
            isPlanExpired: false,
            currentAds: 0,
            maxAds: 0,
            availableAds: 0,
            inactiveAds: 0,
            canCreateAd: false,
            canManageAds: false,
            canBoostAd: false,
            createAdReason: '',
            manageAdsReason: '',
            boostAdReason: '',
            lastFetch: null,
            loading: false,
            error: null,
            userId: null
        });
    },

    // ========== GETTERS (HELPERS) ==========

    /**
     * Verificar se pode criar anúncio
     * @returns {Object} { canCreate: boolean, reason: string }
     */
    checkCanCreateAd: () => {
        const { canCreateAd, createAdReason } = get();
        return { canCreate: canCreateAd, reason: createAdReason };
    },

    /**
     * Verificar se pode gerenciar anúncios
     * @returns {Object} { canManage: boolean, reason: string }
     */
    checkCanManageAds: () => {
        const { canManageAds, manageAdsReason } = get();
        return { canManage: canManageAds, reason: manageAdsReason };
    },

    /**
     * Verificar se pode impulsionar anúncios
     * @returns {Object} { canBoost: boolean, reason: string }
     */
    checkCanBoostAd: () => {
        const { canBoostAd, boostAdReason } = get();
        return { canBoost: canBoostAd, reason: boostAdReason };
    },

    /**
     * Obter resumo completo do plano
     * @returns {Object} Resumo com todas as informações
     */
    getPlanSummary: () => {
        const state = get();
        return {
            planName: state.plan?.display_name || 'Plano Gratuito',
            planPeriod: state.plan?.period || 'free',
            status: state.planStatus,
            endDate: state.planEndDate,
            daysRemaining: state.daysRemaining,
            isExpired: state.isPlanExpired,
            isFree: state.isFreePlan,
            ads: {
                current: state.currentAds,
                max: state.maxAds,
                available: state.availableAds,
                inactive: state.inactiveAds
            },
            permissions: {
                canCreate: state.canCreateAd,
                canManage: state.canManageAds,
                canBoost: state.canBoostAd
            }
        };
    }
}));

// ========== SELETORES OTIMIZADOS ==========
// Usar estes seletores evita re-renders desnecessários

export const selectPlan = (state) => state.plan;
export const selectPlanStatus = (state) => state.planStatus;
export const selectIsFreePlan = (state) => state.isFreePlan;
export const selectIsPlanExpired = (state) => state.isPlanExpired;
export const selectAdCounts = (state) => ({
    current: state.currentAds,
    max: state.maxAds,
    available: state.availableAds,
    inactive: state.inactiveAds
});
export const selectPermissions = (state) => ({
    canCreate: state.canCreateAd,
    canManage: state.canManageAds,
    canBoost: state.canBoostAd
});
export const selectCanCreateAd = (state) => state.canCreateAd;
export const selectCanManageAds = (state) => state.canManageAds;
export const selectCanBoostAd = (state) => state.canBoostAd;
export const selectLoading = (state) => state.loading;
export const selectPlanSummary = (state) => state.getPlanSummary();

