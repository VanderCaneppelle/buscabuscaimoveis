import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    // Guardamos ids de properties favoritados
    const [favorites, setFavorites] = useState(new Set());
    const inFlight = useRef(new Set()); // evita toques múltiplos/conflitos

    const refreshFavorites = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase
                .from('favorites')
                .select('property_id')
                .eq('user_id', user.id);
            if (error) throw error;
            const fetched = new Set((data || []).map(r => r.property_id));
            // Só atualizar estado se houver diferença real (evita re-render global desnecessário)
            const isSame = favorites.size === fetched.size && [...fetched].every(id => favorites.has(id));
            if (!isSame) {
                console.log('[FavoritesContext] refreshFavorites -> atualizando set (tamanho antigo, novo):', favorites.size, fetched.size);
                setFavorites(fetched);
            } else {
                console.log('[FavoritesContext] refreshFavorites -> sem mudanças, não atualiza estado');
            }
        } catch (e) {
            console.log('⚠️ Não foi possível atualizar favoritos:', e?.message || e);
        }
    }, [favorites]);

    // Função para marcar que os favoritos foram modificados (para refresh seletivo)
    const markFavoritesChanged = useCallback((changedId) => {
        lastChangedId.current = changedId || null;
        setFavoritesChanged(true);
        console.log('[FavoritesContext] markFavoritesChanged ->', { changedId });
    }, []);

    const [favoritesChanged, setFavoritesChanged] = useState(false);
    const lastChangedId = useRef(null);

    // Carregar favoritos do usuário autenticado na montagem
    useEffect(() => {
        refreshFavorites();
    }, [refreshFavorites]);

    // Alternar favorito chamando o backend (sem otimista/rollback)
    const toggleFavorite = useCallback(async (propertyId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert('Atenção', 'Você precisa estar logado para favoritar imóveis');
            return;
        }

        // Guard contra múltiplos cliques
        if (inFlight.current.has(propertyId)) return;
        inFlight.current.add(propertyId);

        // 1) Atualização otimista
        const wasFavorited = favorites.has(propertyId);
        console.log('[FavoritesContext] toggleFavorite:start', { propertyId, wasFavorited });
        setFavorites((prev) => {
            const next = new Set(prev);
            if (wasFavorited) next.delete(propertyId); else next.add(propertyId);
            return next;
        });
        markFavoritesChanged(propertyId);

        // 2) Persistir no backend usando RPC idempotente
        try {
            const { data, error } = await supabase.rpc('toggle_favorite', {
                p_user_id: user.id,
                p_property_id: propertyId,
            });

            if (error) {
                const code = error?.code || '';
                if (code !== '23505') { // 23505 é unique_violation, que é esperado para idempotência
                    throw error;
                }
                console.log('[FavoritesContext] toggleFavorite:persisted (idempotent OK)', { propertyId });
            } else {
                console.log('[FavoritesContext] toggleFavorite:persisted', data?.favorited ? 'insert' : 'delete', 'OK', { propertyId });
            }
        } catch (err) {
            // 3) Rollback em caso de erro real
            console.log('[FavoritesContext] toggleFavorite:ERROR, doing rollback', { propertyId, message: err?.message });
            setFavorites((prev) => {
                const next = new Set(prev);
                if (wasFavorited) next.add(propertyId); else next.delete(propertyId);
                return next;
            });
            Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente.');
        } finally {
            console.log('[FavoritesContext] toggleFavorite:done', { propertyId });
            inFlight.current.delete(propertyId);
        }
    }, [favorites, markFavoritesChanged]);

    const isFavorite = useCallback((propertyId) => favorites.has(propertyId), [favorites]);
    const getFavoriteCount = useCallback(() => favorites.size, [favorites]);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, getFavoriteCount, refreshFavorites, favoritesChanged, setFavoritesChanged, lastChangedId }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);
''