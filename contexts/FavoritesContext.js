import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
    // Guardamos ids de properties favoritados
    const [favorites, setFavorites] = useState(new Set());
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const inFlight = useRef(new Set()); // evita toques múltiplos/conflitos

    // Carregar favoritos do usuário autenticado na montagem
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { data, error } = await supabase
                    .from('favorites')
                    .select('property_id')
                    .eq('user_id', user.id);
                if (error) throw error;
                if (!isMounted) return;
                const setIds = new Set((data || []).map(r => r.property_id));
                setFavorites(setIds);
            } catch (e) {
                // silencioso; usuário ainda consegue favoritar manualmente
                console.log('⚠️ Não foi possível carregar favoritos:', e?.message || e);
            }
        })();
        return () => { isMounted = false; };
    }, []);

    // Alternar favorito chamando o backend (sem otimista/rollback)
    const toggleFavorite = useCallback(async (propertyId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Atenção', 'Você precisa estar logado para favoritar imóveis');
                return;
            }

            // evitar chamadas concorrentes para o mesmo id
            if (inFlight.current.has(propertyId)) return;
            inFlight.current.add(propertyId);

            // Chamar RPC idempotente que alterna o estado e retorna favorited boolean
            const { data, error } = await supabase.rpc('toggle_favorite', {
                p_user_id: user.id,
                p_property_id: propertyId,
            });

            if (error) {
                // tratar 23505/unique como sucesso para idempotência
                const code = error?.code || '';
                if (code !== '23505') {
                    Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente em instantes.');
                    return;
                }
            }

            const favorited = data?.favorited ?? data?.favorited === false ? data.favorited : undefined;

            setFavorites((prev) => {
                const next = new Set(prev);
                // Se a RPC informou estado, seguimos; senão, alternamos localmente
                const shouldBeFav = typeof favorited === 'boolean' ? favorited : !next.has(propertyId);
                if (shouldBeFav) {
                    next.add(propertyId);
                    setShouldAnimate(true);
                    setTimeout(() => setShouldAnimate(false), 100);
                } else {
                    next.delete(propertyId);
                }
                return next;
            });
        } catch (e) {
            console.log('❌ Erro ao alternar favorito:', e);
            Alert.alert('Erro', 'Não foi possível atualizar o favorito. Tente novamente em instantes.');
        } finally {
            inFlight.current.delete(propertyId);
        }
    }, []);

    const isFavorite = useCallback((propertyId) => favorites.has(propertyId), [favorites]);
    const getFavoriteCount = useCallback(() => favorites.size, [favorites]);

    return (
        <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, getFavoriteCount, shouldAnimate }}>
            {children}
        </FavoritesContext.Provider>
    );
};

export const useFavorites = () => useContext(FavoritesContext);
''