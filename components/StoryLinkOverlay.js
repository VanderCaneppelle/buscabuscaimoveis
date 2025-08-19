import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Configuração dos tipos de links disponíveis
const LINK_TYPES = {
    whatsapp: {
        icon: 'logo-whatsapp',
        color: '#25D366',
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

export default function StoryLinkOverlay({ linkData, onPress, style }) {
    console.log('🔗 StoryLinkOverlay recebeu:', linkData);

    if (!linkData || !linkData.url) {
        console.log('🔗 StoryLinkOverlay: dados inválidos, não renderizando');
        return null;
    }

    const linkType = LINK_TYPES[linkData.type] || LINK_TYPES.website;
    const iconName = linkData.icon || linkType.icon;
    const backgroundColor = linkData.backgroundColor || linkType.backgroundColor;
    const textColor = linkData.textColor || linkType.color;

    const handlePress = async () => {
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
    };

    return (
        <TouchableOpacity
            style={[
                styles.linkOverlay,
                { backgroundColor },
                style
            ]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Ionicons
                name={iconName}
                size={20}
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
        bottom: 80,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 120,
        justifyContent: 'center',
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});

// Exportar configurações para uso externo
export { LINK_TYPES };
