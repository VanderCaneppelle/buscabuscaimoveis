import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import StoryLinkOverlay from './StoryLinkOverlay';

const { width, height } = Dimensions.get('window');

function StoryOverlays({ story }) {
    if (!story) return null;

    // Parse de coordenadas do título
    let titleCoords = null;
    if (story.title_coordinates) {
        try {
            titleCoords = typeof story.title_coordinates === 'string' 
                ? JSON.parse(story.title_coordinates) 
                : story.title_coordinates;
        } catch (e) {
            console.error('Erro ao parsear coordenadas do título:', e);
        }
    }

    // Parse de coordenadas do link
    let linkCoords = null;
    if (story.link_coordinates) {
        try {
            linkCoords = typeof story.link_coordinates === 'string' 
                ? JSON.parse(story.link_coordinates) 
                : story.link_coordinates;
        } catch (e) {
            console.error('Erro ao parsear coordenadas do link:', e);
        }
    }

    const titleScale = story.title_scale || 1.0;
    const linkScale = story.link_scale || 1.0;

    return (
        <>
            {/* Título do Story - Estilo igual ao preview */}
            {story.title && story.title.trim() !== '' && titleCoords && (
                <View style={[
                    styles.storyTitleContainer,
                    {
                        left: titleCoords.x,
                        top: titleCoords.y,
                        transform: [{ scale: titleScale }],
                    }
                ]}>
                    <Text style={styles.storyTitle} numberOfLines={3}>
                        {story.title}
                    </Text>
                </View>
            )}

            {/* Story Link Overlay - Estilo igual ao preview */}
            {story.link_url && linkCoords && (
                <StoryLinkOverlay
                    linkData={{
                        type: story.link_url.includes('wa.me') ? 'whatsapp' :
                            story.link_url.includes('tel:') ? 'phone' :
                                story.link_url.includes('mailto:') ? 'email' : 'website',
                        url: story.link_url,
                        text: story.link_text || 'Saiba mais'
                    }}
                    coordinates={linkCoords}
                    scale={linkScale}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    storyTitleContainer: {
        position: "absolute",
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 999,
        maxWidth: width - 40,
    },
    storyTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});

// Exportar componente otimizado
export default React.memo(StoryOverlays);
