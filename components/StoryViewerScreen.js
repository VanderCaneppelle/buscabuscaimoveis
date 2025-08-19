import React, { useState, useEffect, useRef } from "react";
import { View, Image, TouchableWithoutFeedback, Dimensions, StyleSheet, Animated, Text, SafeAreaView, StatusBar, Platform, TouchableOpacity, Alert } from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getOptimizedUrl } from "../lib/mediaCacheService";
import StoryLinkOverlay from "./StoryLinkOverlay";
import { useAuth } from "../contexts/AuthContext";
import { StoryService } from "../lib/storyService";

const { width, height } = Dimensions.get("window");
const IMAGE_DURATION = 5000; // 5 segundos

export default function ViewerScreen({ navigation, route }) {
    console.log('Rendered StoryViewerScreen');
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [optimizedUrls, setOptimizedUrls] = useState({});
    const progress = useRef(new Animated.Value(0)).current;
    const videoRef = useRef(null);
    const [videoDuration, setVideoDuration] = useState(0);
    const safetyTimeoutRef = useRef(null);

    useEffect(() => {
        fetchStories();
    }, []);

    useEffect(() => {
        if (route.params?.initialStoryIndex !== undefined) {
            setCurrentIndex(route.params.initialStoryIndex);
        }
    }, [route.params?.initialStoryIndex]);

    useEffect(() => {
        if (stories.length > 0 && currentIndex < stories.length) {
            startProgress();
        }
    }, [currentIndex, stories]);

    useEffect(() => {
        const currentStory = stories[currentIndex];
        if (currentStory?.media_type === 'video' && videoRef.current) {
            progress.setValue(0);
            setVideoDuration(0);
            setTimeout(() => videoRef.current?.playAsync(), 300);
        }
    }, [currentIndex, stories]);

    const fetchStories = async () => {
        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from("stories")
            .select("*")
            .eq("status", "active")
            .gte("created_at", cutoffDate)
            .order("order_index", { ascending: true });

        if (!error && data) {
            setStories(data);
            optimizeStoryUrls(data);
        } else console.error('Erro ao carregar stories:', error);
    };

    const optimizeStoryUrls = async (stories) => {
        try {
            const optimizedUrlsMap = {};
            for (const story of stories) {
                if (story.image_url) {
                    const type = story.media_type === 'video' ? 'video' : 'image';
                    optimizedUrlsMap[story.id] = await getOptimizedUrl(story.image_url, type);
                }
            }
            setOptimizedUrls(optimizedUrlsMap);
        } catch (error) {
            console.error('Erro ao otimizar URLs:', error);
        }
    };

    const startProgress = () => {
        if (!stories[currentIndex]) return;

        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }

        progress.setValue(0);
        const currentStory = stories[currentIndex];

        if (currentStory.media_type === "image") {
            Animated.timing(progress, {
                toValue: 1,
                duration: IMAGE_DURATION,
                useNativeDriver: false,
            }).start(({ finished }) => finished && goNext());

            safetyTimeoutRef.current = setTimeout(goNext, IMAGE_DURATION + 2000);
        }
    };

    const goNext = () => {
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }
        progress.setValue(0);
        setVideoDuration(0);
        videoRef.current?.stopAsync();

        if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
        else navigation.goBack();
    };

    const goPrev = () => {
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }
        progress.setValue(0);
        setVideoDuration(0);
        videoRef.current?.stopAsync();

        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    if (!stories.length) return null;
    const currentStory = stories[currentIndex];

    // Verificar se o usuário atual é o criador do story
    const canDeleteStory = user?.id && currentStory?.user_id === user.id;

    // Função para excluir story
    const handleDeleteStory = async () => {
        if (!canDeleteStory) {
            Alert.alert('Erro', 'Você não tem permissão para excluir este story.');
            return;
        }

        Alert.alert(
            'Excluir Story',
            'Tem certeza que deseja excluir este story? Esta ação não pode ser desfeita.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('🗑️ Iniciando exclusão do story:', currentStory.id);

                            // Usar o StoryService para excluir
                            await StoryService.deleteStory(currentStory.id, user.id);

                            // Atualizar lista local
                            const updatedStories = stories.filter(story => story.id !== currentStory.id);
                            setStories(updatedStories);

                            // Ajustar índice atual se necessário
                            if (currentIndex >= updatedStories.length && updatedStories.length > 0) {
                                setCurrentIndex(updatedStories.length - 1);
                            } else if (updatedStories.length === 0) {
                                // Se não há mais stories, voltar para a tela anterior
                                navigation.goBack();
                                return;
                            }

                            Alert.alert('✅ Sucesso', 'Story excluído com sucesso!');

                        } catch (error) {
                            console.error('❌ Erro ao excluir story:', error);
                            Alert.alert('❌ Erro', `Erro ao excluir story: ${error.message}`);
                        }
                    }
                }
            ]
        );
    };



    // Debug: verificar se o story atual tem link
    if (currentStory.link_url) {
        console.log('🔗 Story com link encontrado:', {
            title: currentStory.title,
            link_url: currentStory.link_url,
            link_text: currentStory.link_text
        });
    }

    // Função para obter o estilo de posicionamento do título
    const getTitlePositionStyle = (position, coordinates = null) => {
        // Se tem coordenadas personalizadas, usar elas
        if (coordinates) {
            try {
                const coords = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
                return { left: coords.x, top: coords.y };
            } catch (error) {
                console.warn('Erro ao parsear coordenadas do título:', error);
            }
        }

        // Senão, usar posições predefinidas
        switch (position) {
            case 'top-center':
                return { top: 100, bottom: 'auto' };
            case 'center':
                return { top: '50%', bottom: 'auto', transform: [{ translateY: -25 }] };
            case 'bottom-center':
            default:
                return { bottom: 100, top: 'auto' };
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.progressBarContainer}>
                    {stories.map((_, index) => (
                        <View key={index} style={styles.progressBarBackground}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    index === currentIndex && {
                                        width: progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%']
                                        })
                                    },
                                    index < currentIndex && { width: '100%' },
                                    index > currentIndex && { width: '0%' },
                                ]}
                            />
                        </View>
                    ))}
                </View>

                <TouchableWithoutFeedback onPress={(e) => e.nativeEvent.locationX < width / 2 ? goPrev() : goNext()}>
                    <View style={styles.storyContainer}>
                        {currentStory.media_type === "image" ? (
                            <View style={styles.mediaContainer}>
                                <Image
                                    source={{ uri: optimizedUrls[currentStory.id] || currentStory.image_url }}
                                    style={styles.media}
                                    resizeMode="cover"
                                    onError={() => setTimeout(goNext, 2000)}
                                />
                                <View style={styles.mediaTypeIndicator}>
                                    <Ionicons name="image" size={20} color="#fff" />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.mediaContainer}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: optimizedUrls[currentStory.id] || currentStory.image_url }}
                                    style={styles.media}
                                    resizeMode="cover"
                                    shouldPlay
                                    isLooping={false}
                                    useNativeControls={false}
                                    volume={1}
                                    onLoad={(data) => {
                                        setVideoDuration(data.durationMillis || 0);
                                        videoRef.current?.playAsync();
                                    }}
                                    onPlaybackStatusUpdate={(status) => {
                                        if (status.isLoaded && status.durationMillis > 0) {
                                            Animated.timing(progress, {
                                                toValue: status.positionMillis / status.durationMillis,
                                                duration: 100,
                                                useNativeDriver: false,
                                            }).start();
                                        }
                                        if (status.didJustFinish) goNext();
                                    }}
                                />
                                <View style={styles.mediaTypeIndicator}>
                                    <Ionicons name="videocam" size={20} color="#fff" />
                                </View>
                            </View>
                        )}
                        {/* Título do Story */}
                        {currentStory.title && currentStory.title.trim() !== '' && (
                            <View style={[
                                styles.storyTitleContainer,
                                getTitlePositionStyle(currentStory.title_position || 'bottom-center', currentStory.title_coordinates)
                            ]}>
                                <Text style={[
                                    styles.storyTitle,
                                    { fontSize: 16 * (currentStory.title_scale || 1.0) }
                                ]}>
                                    {currentStory.title}
                                </Text>
                            </View>
                        )}

                        {/* Story Link Overlay */}
                        {currentStory.link_url && (
                            <>
                                {console.log('🔗 Renderizando StoryLinkOverlay:', currentStory.link_url)}
                                <StoryLinkOverlay
                                    linkData={{
                                        type: currentStory.link_url.includes('wa.me') ? 'whatsapp' :
                                            currentStory.link_url.includes('tel:') ? 'phone' :
                                                currentStory.link_url.includes('mailto:') ? 'email' : 'website',
                                        url: currentStory.link_url,
                                        text: currentStory.link_text || 'Saiba mais'
                                    }}
                                    position={currentStory.link_position || 'bottom-right'}
                                    coordinates={currentStory.link_coordinates ? JSON.parse(currentStory.link_coordinates) : null}
                                    scale={currentStory.link_scale || 1.0}
                                />
                            </>
                        )}

                        {/* Botão de Exclusão */}
                        {canDeleteStory && (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDeleteStory}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="trash-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableWithoutFeedback>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "black",
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    container: { flex: 1 },
    progressBarContainer: {
        flexDirection: "row",
        position: "absolute",
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 10,
        right: 10,
        zIndex: 1,
    },
    progressBarBackground: {
        flex: 1,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginHorizontal: 2,
        borderRadius: 2,
    },
    progressBarFill: {
        height: 6,
        backgroundColor: "#ff0000",
        borderRadius: 3,
        shadowColor: "#ff0000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 5,
    },
    storyContainer: { flex: 1, justifyContent: "center", position: "relative" },
    mediaContainer: { position: "relative", width, height },
    media: { width, height },
    mediaTypeIndicator: {
        position: "absolute",
        top: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        borderRadius: 15,
        padding: 5,
    },
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
    deleteButton: {
        position: "absolute",
        top: Platform.OS === 'ios' ? 100 : 80,
        right: 20,
        backgroundColor: "rgba(255, 0, 0, 0.8)",
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 10000,
    },
});
