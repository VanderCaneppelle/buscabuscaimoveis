import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Configuração dos tipos de links disponíveis
const LINK_TYPES = {
    whatsapp: {
        icon: 'logo-whatsapp',
        color: '#ffffff',
        backgroundColor: 'rgba(37, 211, 102, 0.9)',
    },
    phone: {
        icon: 'call-outline',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    email: {
        icon: 'mail-outline',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    website: {
        icon: 'globe-outline',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    instagram: {
        icon: 'logo-instagram',
        color: '#fff',
        backgroundColor: 'rgba(225, 48, 108, 0.9)',
    },
};

function StoryLinkOverlay({ linkData, onPress, style, coordinates = null, scale = 1.0 }) {
    if (!linkData || !linkData.url) {
        return null;
    }

    const linkType = LINK_TYPES[linkData.type] || LINK_TYPES.website;
    const iconName = linkData.icon || linkType.icon;
    const backgroundColor = linkData.backgroundColor || linkType.backgroundColor;
    const textColor = linkData.textColor || linkType.color;

    const handlePress = useCallback(async () => {
        try {
            // Se tem callback customizado, usar ele
            if (onPress) {
                onPress(linkData);
                return;
            }

            // Verificar se o link pode ser aberto
            const canOpen = await Linking.canOpenURL(linkData.url);

            if (canOpen) {
                await Linking.openURL(linkData.url);
            } else {
                Alert.alert(
                    'Erro',
                    'Não foi possível abrir este link',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Erro ao abrir link:', error);
            Alert.alert(
                'Erro',
                'Ocorreu um erro ao abrir o link',
                [{ text: 'OK' }]
            );
        }
    }, [linkData, onPress]);

    // Se não tem coordenadas, não mostrar (agora sempre usa coordenadas customizadas)
    if (!coordinates) {
        return null;
    }

    return (
        <TouchableOpacity
            style={[
                styles.linkOverlay,
                { 
                    backgroundColor,
                    left: coordinates.x,
                    top: coordinates.y,
                    transform: [{ scale: scale }],
                },
                style
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <Ionicons
                name={iconName}
                size={16}
                color={textColor}
            />
            <Text style={[styles.linkText, { color: textColor }]}>
                {linkData.text || 'Saiba mais'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    linkOverlay: {
        position: 'absolute',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        minWidth: 100,
        zIndex: 999,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

// Exportar configurações para uso externo
export { LINK_TYPES };

// Exportar componente otimizado
export default React.memo(StoryLinkOverlay);
