import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import PropertyCacheService from '../lib/propertyCacheService';

/**
 * =====================================================
 * STORE DE IMÓVEIS (PROPERTIES)
 * =====================================================
 * Gerencia estado global de imóveis com Realtime
 * ✨ Atualiza automaticamente quando imóveis são criados/atualizados/excluídos
 * =====================================================
 */
export const usePropertiesStore = create((set, get) => ({
    // ========== ESTADO ==========
    properties: [], // Lista de imóveis
    totalCount: 0, // Total de imóveis
    currentPage: 0, // Página atual
    hasMore: true, // Se há mais páginas
    loading: false, // Loading geral
    filters: {
        city: '',
        propertyType: [],
        minPrice: '',
        maxPrice: '',
    },
    searchTerm: '',
    realtimeChannel: null, // Canal Realtime
    isRealtimeConnected: false, // Status conexão

    // ========== AÇÕES ==========

    /**
     * Carregar imóveis (integrado com cache)
     */
    fetchProperties: async (options = {}) => {
        const {
            page = 0,
            filters = null,
            searchTerm = null,
            forceRefresh = false,
        } = options;

        try {
            const activeFilters = filters || get().filters;
            const activeSearch = searchTerm !== null ? searchTerm : get().searchTerm;

            set({ loading: page === 0 });

            const result = await PropertyCacheService.getProperties({
                page,
                filters: activeFilters,
                searchTerm: activeSearch,
                forceRefresh,
                enableParallelUpdate: true,
            });

            if (page === 0) {
                set({
                    properties: result.data,
                    currentPage: page,
                    hasMore: result.hasMore,
                    totalCount: result.totalCount,
                    filters: activeFilters,
                    searchTerm: activeSearch,
                });
            } else {
                set(state => ({
                    properties: [...state.properties, ...result.data],
                    currentPage: page,
                    hasMore: result.hasMore,
                    totalCount: result.totalCount,
                }));
            }

            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);
            return { success: false, error };
        } finally {
            set({ loading: false });
        }
    },

    /**
     * Atualizar filtros e recarregar
     */
    setFilters: async (newFilters) => {
        set({ filters: newFilters, currentPage: 0 });
        await get().fetchProperties({ page: 0, filters: newFilters, forceRefresh: true });
    },

    /**
     * Atualizar busca e recarregar
     */
    setSearchTerm: async (term) => {
        set({ searchTerm: term, currentPage: 0 });
        await get().fetchProperties({ page: 0, searchTerm: term, forceRefresh: true });
    },

    /**
     * Carregar mais (paginação)
     */
    loadMore: async () => {
        const { currentPage, hasMore, loading } = get();
        if (loading || !hasMore) return;

        await get().fetchProperties({ page: currentPage + 1 });
    },

    /**
     * Refresh manual
     */
    refresh: async () => {
        await get().fetchProperties({ page: 0, forceRefresh: true });
    },

    // ========== REALTIME ==========

    /**
     * ✨ Conectar Realtime para atualizações automáticas
     * @param {Function} onUpdate - Callback opcional para notificar componentes
     */
    connectRealtime: (onUpdate = null) => {
        const { realtimeChannel, isRealtimeConnected } = get();

        // Evitar múltiplas conexões
        if (isRealtimeConnected && realtimeChannel) {
            console.log('[PropertiesStore] Realtime já está conectado');
            return;
        }

        console.log('🔴 [PropertiesStore] Conectando Realtime...');

        // Criar canal Realtime
        const channel = supabase
            .channel('properties-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'properties',
                    filter: 'status=eq.approved', // Apenas aprovados
                },
                (payload) => {
                    console.log('🔔 [PropertiesStore] Novo imóvel APROVADO via Realtime:', payload.new.id);
                    
                    // Apenas se for aprovado e ativo
                    if (payload.new.status === 'approved' && payload.new.ad_status === 'active') {
                        // Notificar componente se callback foi passado
                        if (onUpdate) {
                            onUpdate({ type: 'INSERT', data: payload.new });
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'properties',
                },
                (payload) => {
                    console.log('🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime:', payload.new.id);
                    
                    // Se foi inativado ou rejeitado, notificar remoção
                    if (payload.new.ad_status === 'inactive' || payload.new.status === 'rejected') {
                        console.log('🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado:', payload.new.id);
                        
                        if (onUpdate) {
                            onUpdate({ type: 'REMOVE', data: payload.new });
                        }
                    }
                    // Se foi aprovado, notificar adição/atualização
                    else if (payload.new.status === 'approved' && payload.new.ad_status === 'active') {
                        if (onUpdate) {
                            onUpdate({ type: 'UPDATE', data: payload.new });
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'properties',
                },
                (payload) => {
                    console.log('🗑️ [PropertiesStore] Imóvel EXCLUÍDO via Realtime:', payload.old.id);
                    
                    // Notificar remoção
                    if (onUpdate) {
                        onUpdate({ type: 'DELETE', data: payload.old });
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 [PropertiesStore] Status Realtime:', status);
                
                if (status === 'SUBSCRIBED') {
                    set({ isRealtimeConnected: true });
                } else if (status === 'CLOSED') {
                    set({ isRealtimeConnected: false });
                }
            });

        set({ realtimeChannel: channel });
    },

    /**
     * ✨ Desconectar Realtime
     */
    disconnectRealtime: () => {
        const { realtimeChannel } = get();
        
        if (realtimeChannel) {
            console.log('🔴 [PropertiesStore] Desconectando Realtime');
            supabase.removeChannel(realtimeChannel);
            set({ 
                realtimeChannel: null, 
                isRealtimeConnected: false 
            });
        }
    },

    /**
     * Resetar store
     */
    reset: () => {
        console.log('[PropertiesStore] Resetando store');
        
        // Desconectar Realtime
        const { realtimeChannel } = get();
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }

        set({
            properties: [],
            totalCount: 0,
            currentPage: 0,
            hasMore: true,
            loading: false,
            filters: {
                city: '',
                propertyType: [],
                minPrice: '',
                maxPrice: '',
            },
            searchTerm: '',
            realtimeChannel: null,
            isRealtimeConnected: false,
        });
    },
}));

// Seletores para otimização
export const selectProperties = (state) => state.properties;
export const selectLoading = (state) => state.loading;
export const selectTotalCount = (state) => state.totalCount;
export const selectHasMore = (state) => state.hasMore;
export const selectFilters = (state) => state.filters;

