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
                setFavorites(fetched);
            }
        } catch (e) {
            console.log('⚠️ Não foi possível atualizar favoritos:', e?.message || e);
        }
    }, [favorites]);

    // Função para marcar que os favoritos foram modificados (para refresh seletivo)
    const markFavoritesChanged = useCallback((changedId) => {
        setFavoritesChanged(true);
        lastChangedId.current = changedId || null;
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
        setFavorites((prev) => {
            const next = new Set(prev);
            if (wasFavorited) next.delete(propertyId); else next.add(propertyId);
            return next;
        });
        markFavoritesChanged(propertyId);

        // 2) Persistir no backend (idempotente)
        try {
            if (wasFavorited) {
                // Remover
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('property_id', propertyId);
                if (error) throw error;
            } else {
                // Inserir de forma idempotente (onConflict)
                const { error } = await supabase
                    .from('favorites')
                    .insert({ user_id: user.id, property_id: propertyId }, { onConflict: 'user_id,property_id', ignoreDuplicates: true });
                if (error) throw error;
            }
        } catch (err) {
            // 3) Rollback em caso de erro real
            setFavorites((prev) => {
                const next = new Set(prev);
                if (wasFavorited) next.add(propertyId); else next.delete(propertyId);
                return next;
            });
            Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente.');
        } finally {
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