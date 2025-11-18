import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavoritesStore } from '../stores/favoritesStore';
import AppText from './AppText';

/**
 * FavoriteButton - Botão de selecionar usando Zustand
 * ✨ Se inscreve DIRETAMENTE na store - atualiza quando Realtime dispara
 * React.memo SEM comparação customizada - deixa Zustand notificar mudanças
 */
const FavoriteButton = React.memo(({ propertyId, disabled }) => {
    // ✨ Zustand notifica automaticamente quando favorites mudam via Realtime
    const isFavorited = useFavoritesStore(state => state.isFavorite(propertyId));
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const inFlight = useFavoritesStore(state => state.inFlight.has(propertyId));

    const handlePress = useCallback(() => {
        if (disabled || inFlight) return;
        toggleFavorite(propertyId);
    }, [disabled, inFlight, toggleFavorite, propertyId]);

    return (
        <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
                onPress={handlePress}
                disabled={disabled || inFlight}
                activeOpacity={0.8}
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 8,
                    padding: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Ionicons
                    name={isFavorited ? 'cart' : 'cart-outline'}
                    size={20}
                    color={isFavorited ? '#00335e' : '#666'}
                />
            </TouchableOpacity>
            <AppText style={{
                fontSize: 9,
                color: '#fff',
                marginTop: 2,
                fontWeight: '500',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 3,
            }}>
                {isFavorited ? 'Selecionado' : 'Selecionar'}
            </AppText>
        </View>
    );
}); // ✨ Removida comparação customizada - deixa Zustand notificar

export default FavoriteButton;


