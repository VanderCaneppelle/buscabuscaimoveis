import React, { useState, useEffect, useRef } from "react";
import { View, TouchableWithoutFeedback, Dimensions, StyleSheet, Animated, Text, SafeAreaView, StatusBar, Platform, Alert } from "react-native";
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
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            navigation.goBack();
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleStoryComplete = () => {
        goNext();
    };

    const handleProgressUpdate = (progressValue) => {
        setCurrentProgress(progressValue);
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
