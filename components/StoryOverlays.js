import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import StoryLinkOverlay from './StoryLinkOverlay';

function StoryOverlays({ story }) {
    if (!story) return null;

    // Função para obter o estilo de posicionamento do título
    const getTitlePositionStyle = (position, coordinates) => {
        if (coordinates) {
            try {
                const coords = JSON.parse(coordinates);
                return { left: coords.x, top: coords.y };
            } catch (e) {
                console.error('Erro ao parsear coordenadas do título:', e);
            }
        }

        switch (position) {
            case 'top-left':
                return { top: 100, left: 20 };
            case 'top-right':
                return { top: 100, right: 20 };
            case 'top-center':
                return { top: 100, left: 20, right: 20 };
            case 'center':
                return { top: '50%', left: 20, right: 20, transform: [{ translateY: -25 }] };
            case 'bottom-left':
                return { bottom: 100, left: 20 };
            case 'bottom-right':
                return { bottom: 100, right: 20 };
            case 'bottom-center':
            default:
                return { bottom: 100, left: 20, right: 20 };
        }
    };

    return (
        <>
            {/* Título do Story */}
            {story.title && story.title.trim() !== '' && (
                <View style={[
                    styles.storyTitleContainer,
                    getTitlePositionStyle(story.title_position || 'bottom-center', story.title_coordinates)
                ]}>
                    <Text style={[
                        styles.storyTitle,
                        { fontSize: 16 * (story.title_scale || 1.0) }
                    ]}>
                        {story.title}
                    </Text>
                </View>
            )}

            {/* Story Link Overlay */}
            {story.link_url && (
                <StoryLinkOverlay
                    linkData={{
                        type: story.link_url.includes('wa.me') ? 'whatsapp' :
                            story.link_url.includes('tel:') ? 'phone' :
                                story.link_url.includes('mailto:') ? 'email' : 'website',
                        url: story.link_url,
                        text: story.link_text || 'Saiba mais'
                    }}
                    position={story.link_position || 'bottom-right'}
                    coordinates={story.link_coordinates ? JSON.parse(story.link_coordinates) : null}
                    scale={story.link_scale || 1.0}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    storyTitleContainer: {
        position: "absolute",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 9999,
    },
    storyTitle: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
});

// Exportar componente otimizado
export default React.memo(StoryOverlays);
