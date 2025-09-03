import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, TouchableWithoutFeedback, Dimensions, StyleSheet, Animated, Text, SafeAreaView, StatusBar, Platform, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from "../lib/supabase";
import { getOptimizedUrl } from "../lib/mediaCacheService";
import StoryItem from "./StoryItem";
import StoryControls from "./StoryControls";
import StoryOverlays from "./StoryOverlays";
import { useAuth } from "../contexts/AuthContext";
import { StoryService } from "../lib/storyService";

const { width, height } = Dimensions.get("window");

export default function ViewerScreen({ navigation, route }) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [stories, setStories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [optimizedUrls, setOptimizedUrls] = useState({});
    const [currentProgress, setCurrentProgress] = useState(0);
    const hasClosed = useRef(false);
    const progressAnim = useRef(null);


    useEffect(() => {
        fetchStories();
    }, []);

    useEffect(() => {
        if (route.params?.initialStoryIndex !== undefined) {
            setCurrentIndex(route.params.initialStoryIndex);
        }
    }, [route.params?.initialStoryIndex]);

    useEffect(() => {
        // Reset progress quando muda de story
        setCurrentProgress(0);
    }, [currentIndex]);

    // Cleanup quando o componente é desmontado
    useEffect(() => {
        return () => {
            hasClosed.current = true;
            if (progressAnim.current) {
                progressAnim.current.stopAnimation();
                progressAnim.current.removeAllListeners();
            }
        };
    }, []);

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
            const optimizedUrlsPromises = stories
                .filter(story => story.image_url)
                .map(async story => {
                    const type = story.media_type === 'video' ? 'video' : 'image';
                    const optimizedUrl = await getOptimizedUrl(story.image_url, type);
                    return [story.id, optimizedUrl];
                });

            const optimizedUrlsArray = await Promise.all(optimizedUrlsPromises);
            const optimizedUrlsMap = Object.fromEntries(optimizedUrlsArray);
            setOptimizedUrls(optimizedUrlsMap);
        } catch (error) {
            console.error('Erro ao otimizar URLs:', error);
        }
    };



    const goNext = () => {
        if (hasClosed.current) return;

        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            hasClosed.current = true;
            navigation.goBack();
        }
    };


    const goPrev = () => {
        if (hasClosed.current) return;
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleStoryComplete = () => {
        if (hasClosed.current) return;
        goNext();
    };

    const handleProgressUpdate = (progressValue, animRef) => {
        setCurrentProgress(progressValue);
        // Armazenar referência da animação para poder pará-la quando fechar
        if (animRef && !progressAnim.current) {
            progressAnim.current = animRef;
        }
    };

    // Função para fechar o visualizador
    const handleCloseViewer = () => {
        // Marcar como fechado para evitar execução de callbacks
        hasClosed.current = true;

        // Parar todas as animações em andamento
        if (progressAnim.current) {
            progressAnim.current.stopAnimation();
            progressAnim.current.removeAllListeners();
        }

        // Navegar de volta
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Se não puder voltar, navegar para home
            navigation.navigate('home');
        }
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
                                navigation.navigate('home');
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







    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <TouchableWithoutFeedback onPress={(e) => e.nativeEvent.locationX < width / 2 ? goPrev() : goNext()}>
                <View style={styles.storyContainer}>
                    <StoryItem
                        story={currentStory}
                        optimizedUrl={optimizedUrls[currentStory.id]}
                        isActive={true}
                        onComplete={handleStoryComplete}
                        onProgressUpdate={handleProgressUpdate}
                    />

                    {/* Story Overlays (Título e Link) */}
                    <StoryOverlays story={currentStory} />

                    {/* Story Controls */}
                    <StoryControls
                        stories={stories}
                        currentIndex={currentIndex}
                        currentProgress={currentProgress}
                        canDeleteStory={canDeleteStory}
                        onDeletePress={handleDeleteStory}
                        onClosePress={handleCloseViewer}
                    />
                </View>
            </TouchableWithoutFeedback>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "black"
    },
    storyContainer: {
        flex: 1,
        justifyContent: "center",
        position: "relative"
    },
});
