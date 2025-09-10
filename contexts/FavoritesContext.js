import React, { createContext, useContext, useState, useCallback } from 'react';

const FavoritesContext = createContext();

export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (!context) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState({});
    const [shouldAnimate, setShouldAnimate] = useState(false);

    const toggleFavorite = useCallback((propertyId) => {
        setFavorites(prev => {
            const newFavorites = { ...prev };
            const isCurrentlyFavorite = newFavorites[propertyId];

            if (isCurrentlyFavorite) {
                delete newFavorites[propertyId];
            } else {
                newFavorites[propertyId] = true;
                // Disparar animação apenas quando favoritar (não quando desfavoritar)
                setShouldAnimate(true);
                // Resetar flag após um tempo
                setTimeout(() => setShouldAnimate(false), 100);
            }

            return newFavorites;
        });
    }, []);

    const isFavorite = useCallback((propertyId) => {
        return !!favorites[propertyId];
    }, [favorites]);

    const getFavoriteCount = useCallback(() => {
        return Object.keys(favorites).length;
    }, [favorites]);

    const value = {
        favorites,
        toggleFavorite,
        isFavorite,
        getFavoriteCount,
        shouldAnimate,
        setShouldAnimate,
    };

    return (
        <FavoritesContext.Provider value={value}>
            {children}
        </FavoritesContext.Provider>
    );
};
