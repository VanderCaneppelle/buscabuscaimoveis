import { create } from 'zustand';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

/**
 * Store de Favoritos usando Zustand
 * Gerencia o estado global de propriedades favoritadas
 */
export const useFavoritesStore = create((set, get) => ({
    // ========== ESTADO ==========
    favorites: new Set(), // Set de IDs de propriedades favoritadas
    inFlight: new Set(), // IDs em processo de toggle (evita cliques múltiplos)
    favoritesChanged: false, // Flag para animações (badge, etc)
    lastChangedId: null, // Último ID modificado (para animações específicas)

    // ========== AÇÕES ==========

    /**
     * Alternar favorito (adicionar/remover)
     * Implementa atualização otimista com rollback em caso de erro
     */
    toggleFavorite: async (propertyId) => {
        const { favorites, inFlight } = get();

        // 1) Verificar autenticação
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert('Atenção', 'Você precisa estar logado para favoritar imóveis');
            return;
        }

        // 2) Guard contra múltiplos cliques
        if (inFlight.has(propertyId)) {
            console.log('[FavoritesStore] Operação já em andamento, ignorando:', propertyId);
            return;
        }

        // 3) Marcar como em processamento
        const newInFlight = new Set(inFlight);
        newInFlight.add(propertyId);
        set({ inFlight: newInFlight });

        // 4) Atualização otimista
        const wasFavorited = favorites.has(propertyId);
        const nextFavorites = new Set(favorites);
        if (wasFavorited) {
            nextFavorites.delete(propertyId);
        } else {
            nextFavorites.add(propertyId);
        }

        console.log('[FavoritesStore] toggleFavorite:start', {
            propertyId,
            wasFavorited,
            newState: !wasFavorited
        });

        set({
            favorites: nextFavorites,
            favoritesChanged: true,
            lastChangedId: propertyId
        });

        // 5) Persistir no backend
        try {
            const { data, error } = await supabase.rpc('toggle_favorite', {
                p_user_id: user.id,
                p_property_id: propertyId,
            });

            if (error) {
                const code = error?.code || '';
                if (code !== '23505') { // 23505 é unique_violation (idempotente)
                    throw error;
                }
                console.log('[FavoritesStore] toggleFavorite:persisted (idempotent OK)', { propertyId });
            } else {
                console.log('[FavoritesStore] toggleFavorite:persisted', data?.favorited ? 'insert' : 'delete', 'OK', { propertyId });
            }
        } catch (err) {
            // 6) Rollback em caso de erro
            console.error('[FavoritesStore] toggleFavorite:ERROR, doing rollback', {
                propertyId,
                message: err?.message
            });

            const rollbackFavorites = new Set(favorites);
            if (wasFavorited) {
                rollbackFavorites.add(propertyId);
            } else {
                rollbackFavorites.delete(propertyId);
            }

            set({ favorites: rollbackFavorites });
            Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente.');
        } finally {
            // 7) Remover da lista de processamento
            const updatedInFlight = new Set(get().inFlight);
            updatedInFlight.delete(propertyId);
            set({ inFlight: updatedInFlight });

            console.log('[FavoritesStore] toggleFavorite:done', { propertyId });
        }
    },

    /**
     * Verificar se uma propriedade está favoritada
     */
    isFavorite: (propertyId) => {
        return get().favorites.has(propertyId);
    },

    /**
     * Obter quantidade de favoritos
     */
    getFavoriteCount: () => {
        return get().favorites.size;
    },

    /**
     * Recarregar favoritos do banco de dados
     */
    refreshFavorites: async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('[FavoritesStore] Sem usuário logado, limpando favoritos');
                set({ favorites: new Set() });
                return;
            }

            const { data, error } = await supabase
                .from('favorites')
                .select('property_id')
                .eq('user_id', user.id);

            if (error) throw error;

            const fetchedFavorites = new Set((data || []).map(r => r.property_id));
            const currentFavorites = get().favorites;

            // Só atualizar se houver diferença (evita re-renders desnecessários)
            const isSame = currentFavorites.size === fetchedFavorites.size &&
                [...fetchedFavorites].every(id => currentFavorites.has(id));

            if (!isSame) {
                console.log('[FavoritesStore] refreshFavorites -> atualizando', {
                    antes: currentFavorites.size,
                    depois: fetchedFavorites.size
                });
                set({ favorites: fetchedFavorites });
            } else {
                console.log('[FavoritesStore] refreshFavorites -> sem mudanças');
            }
        } catch (e) {
            console.error('[FavoritesStore] Erro ao atualizar favoritos:', e?.message || e);
        }
    },

    /**
     * Limpar flag de mudanças (usado para animações)
     */
    clearFavoritesChanged: () => {
        set({ favoritesChanged: false, lastChangedId: null });
    },

    /**
     * Resetar store (útil para logout)
     */
    reset: () => {
        console.log('[FavoritesStore] Resetando store');
        set({
            favorites: new Set(),
            inFlight: new Set(),
            favoritesChanged: false,
            lastChangedId: null
        });
    }
}));

// Export individual de seletores para otimização
export const selectFavorites = (state) => state.favorites;
export const selectIsFavorite = (state) => state.isFavorite;
export const selectToggleFavorite = (state) => state.toggleFavorite;
export const selectFavoriteCount = (state) => state.getFavoriteCount();
export const selectFavoritesChanged = (state) => state.favoritesChanged;
export const selectLastChangedId = (state) => state.lastChangedId;

