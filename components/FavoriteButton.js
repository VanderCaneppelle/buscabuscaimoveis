import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../contexts/FavoritesContext';

const FavoriteButton = React.memo(({ isFavorited, onPress, disabled, propertyId }) => {
    const { toggleFavorite } = useFavorites();
    const [localOn, setLocalOn] = useState(!!isFavorited);
    const inFlight = useRef(false);

    // Sincronizar prop externa quando mudar (ex.: vindo de outra tela)
    useEffect(() => {
        setLocalOn(!!isFavorited);
    }, [isFavorited]);

    const handlePress = useCallback(() => {
        if (disabled || inFlight.current) return;
        inFlight.current = true;
        // Atualização otimista local, sem re-render do card/lista
        const nextOn = !localOn;
        setLocalOn(nextOn);
        const action = typeof onPress === 'function' ? onPress : () => toggleFavorite(propertyId);
        Promise.resolve(action())
            .catch(() => setLocalOn(!nextOn))
            .finally(() => { inFlight.current = false; });
    }, [disabled, localOn, onPress, toggleFavorite, propertyId]);

    return (
        <View>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled}
                activeOpacity={0.8}
                style={{
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 20,
                    padding: 8,
                }}
            >
                <Ionicons
                    name={localOn ? 'heart' : 'heart-outline'}
                    size={30}
                    color={localOn ? '#e74c3c' : '#ffffff'}
                />
            </TouchableOpacity>
        </View>
    );
}, (prev, next) => prev.disabled === next.disabled && prev.propertyId === next.propertyId);

export default FavoriteButton;


