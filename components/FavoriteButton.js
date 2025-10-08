import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritesStore } from '../stores/favoritesStore';

/**
 * FavoriteButton - Botão de favoritar usando Zustand
 * Simplificado: não precisa mais de estado local duplicado
 */
const FavoriteButton = React.memo(({ propertyId, disabled }) => {
    const isFavorited = useFavoritesStore(state => state.isFavorite(propertyId));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const inFlight = useFavoritesStore(state => state.inFlight.has(propertyId));

    const handlePress = useCallback(() => {
        if (disabled || inFlight) return;
        toggleFavorite(propertyId);
    }, [disabled, inFlight, toggleFavorite, propertyId]);

    return (
        <View>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled || inFlight}
                activeOpacity={0.8}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 20,
                    padding: 8,
                }}
            >
                <Ionicons
                    name={isFavorited ? 'heart' : 'heart-outline'}
                    size={30}
                    color={isFavorited ? '#e74c3c' : '#ffffff'}
                />
            </TouchableOpacity>
        </View>
    );
}, (prev, next) =>
    prev.disabled === next.disabled &&
    prev.propertyId === next.propertyId
);

export default FavoriteButton;


