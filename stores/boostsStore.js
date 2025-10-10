import { create } from 'zustand';
import { BoostService } from '../lib/boostService';

/**
 * Store de Boosts usando Zustand
 * Gerencia o estado global de propriedades impulsionadas (boosted)
 * 
 * Features:
 * - Cache inteligente (5 minutos)
 * - Sincronização automática entre HomeScreen e DiscoverScreen
 * - Atualização otimista após pagamento
 * - Performance O(1) para verificação de boost
 */
export const useBoostsStore = create((set, get) => ({
    // ========== ESTADO ==========
    boostedPropertyIds: new Set(),        // IDs de propriedades boosted (para badges na Home)
    boostedProperties: [],                // Propriedades completas (para DiscoverScreen)
    lastFetch: null,                      // Timestamp da última busca (para cache)
    loading: false,                       // Estado de carregamento
    error: null,                          // Último erro

    // ========== AÇÕES ==========

    /**
     * Buscar IDs de propriedades boosted (otimizado para HomeScreen com paginação)
     * @param {Array|null} propertyIds - IDs específicos para filtrar (opcional)
     * @param {boolean} forceRefresh - Forçar busca ignorando cache
     * @returns {Set} Set de IDs boosted
     */
    fetchBoostedIds: async (propertyIds = null, forceRefresh = false) => {
        const { lastFetch, boostedPropertyIds } = get();
        const now = Date.now();
        const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

        // Cache: não buscar se já temos dados recentes
        if (!forceRefresh && lastFetch && (now - lastFetch) < CACHE_TIME && boostedPropertyIds.size > 0) {
            console.log('[BoostsStore] 📦 Usando cache de IDs boosted');
            return boostedPropertyIds;
        }

        console.log('[BoostsStore] 🔄 Buscando IDs boosted do servidor...');
        set({ loading: true, error: null });

        try {
            const ids = await BoostService.getBoostedPropertyIds(propertyIds);
            
            console.log(`[BoostsStore] ✅ ${ids.size} IDs boosted carregados`);
            
            set({
                boostedPropertyIds: ids,
                lastFetch: now,
                loading: false
            });
            
            return ids;
        } catch (error) {
            console.error('[BoostsStore] ❌ Erro ao buscar IDs boosted:', error);
            set({ error: error.message, loading: false });
            return new Set();
        }
    },

    /**
     * Buscar propriedades completas boosted (para DiscoverScreen)
     * @param {boolean} forceRefresh - Forçar busca ignorando cache
     * @returns {Array} Array de propriedades boosted
     */
    fetchBoostedProperties: async (forceRefresh = false) => {
        const { lastFetch, boostedProperties } = get();
        const now = Date.now();
        const CACHE_TIME = 5 * 60 * 1000; // 5 minutos

        // Cache: não buscar se já temos dados recentes
        if (!forceRefresh && lastFetch && (now - lastFetch) < CACHE_TIME && boostedProperties.length > 0) {
            console.log('[BoostsStore] 📦 Usando cache de propriedades boosted');
            return boostedProperties;
        }

        console.log('[BoostsStore] 🔄 Buscando propriedades boosted do servidor...');
        set({ loading: true, error: null });

        try {
            const properties = await BoostService.getBoostedProperties();
            
            // Atualizar também os IDs (sincronização automática)
            const ids = new Set(properties.map(p => p.property_id));
            
            console.log(`[BoostsStore] ✅ ${properties.length} propriedades boosted carregadas`);
            
            set({
                boostedProperties: properties,
                boostedPropertyIds: ids,
                lastFetch: now,
                loading: false
            });
            
            return properties;
        } catch (error) {
            console.error('[BoostsStore] ❌ Erro ao buscar propriedades boosted:', error);
            set({ error: error.message, loading: false });
            return [];
        }
    },

    /**
     * Verificar se uma propriedade está boosted
     * Complexidade: O(1)
     * @param {string} propertyId - ID da propriedade
     * @returns {boolean}
     */
    isBoosted: (propertyId) => {
        return get().boostedPropertyIds.has(propertyId);
    },

    /**
     * Obter quantidade de propriedades boosted
     * @returns {number}
     */
    getBoostedCount: () => {
        return get().boostedPropertyIds.size;
    },

    /**
     * Adicionar boost (após pagamento bem-sucedido)
     * Atualização otimista - não espera o servidor
     * @param {string} propertyId - ID da propriedade
     */
    addBoost: (propertyId) => {
        const { boostedPropertyIds } = get();
        const newIds = new Set(boostedPropertyIds);
        newIds.add(propertyId);
        
        set({ boostedPropertyIds: newIds });
        console.log('[BoostsStore] ✨ Boost adicionado (otimista):', propertyId);
    },

    /**
     * Remover boost (quando expira ou é cancelado)
     * @param {string} propertyId - ID da propriedade
     */
    removeBoost: (propertyId) => {
        const { boostedPropertyIds, boostedProperties } = get();
        
        const newIds = new Set(boostedPropertyIds);
        newIds.delete(propertyId);
        
        const newProperties = boostedProperties.filter(p => p.property_id !== propertyId);
        
        set({
            boostedPropertyIds: newIds,
            boostedProperties: newProperties
        });
        
        console.log('[BoostsStore] 🗑️ Boost removido:', propertyId);
    },

    /**
     * Invalidar cache (forçar próxima busca)
     * Útil após criar/editar/deletar boost
     */
    invalidateCache: () => {
        set({ lastFetch: null });
        console.log('[BoostsStore] 🔄 Cache invalidado - próxima busca será do servidor');
    },

    /**
     * Refresh manual (força nova busca)
     * Útil para pull-to-refresh
     */
    refresh: async () => {
        console.log('[BoostsStore] 🔄 Refresh manual iniciado');
        const { fetchBoostedIds, fetchBoostedProperties } = get();
        
        // Buscar ambos em paralelo
        await Promise.all([
            fetchBoostedIds(null, true),
            fetchBoostedProperties(true)
        ]);
        
        console.log('[BoostsStore] ✅ Refresh manual concluído');
    },

    /**
     * Resetar store (útil para logout)
     */
    reset: () => {
        console.log('[BoostsStore] 🔄 Resetando store');
        set({
            boostedPropertyIds: new Set(),
            boostedProperties: [],
            lastFetch: null,
            loading: false,
            error: null
        });
    }
}));

// ========== SELETORES OTIMIZADOS ==========
// Usar estes seletores evita re-renders desnecessários

export const selectBoostedIds = (state) => state.boostedPropertyIds;
export const selectBoostedProperties = (state) => state.boostedProperties;
export const selectIsBoosted = (state) => state.isBoosted;
export const selectBoostsLoading = (state) => state.loading;
export const selectBoostsError = (state) => state.error;
export const selectBoostedCount = (state) => state.getBoostedCount();

