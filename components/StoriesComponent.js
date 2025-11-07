import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert,
    RefreshControl,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOptimizedUrl, cleanupOldCache, clearAllCache, getCacheStats, verifyCacheIntegrity } from '../lib/mediaCacheService';
import StoryLinkOverlay from './StoryLinkOverlay';

const { width } = Dimensions.get('window');
const STORY_SIZE = 70;
const CACHE_KEY = 'cached_stories';
const CACHE_DURATION = 10 * 60 * 1000; // ✨ 10 minutos de cache

export default function StoriesComponent({ navigation }) {
    const { isAdmin } = useAdmin();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

    useEffect(() => {
        // No iOS, carregar apenas uma vez para evitar piscadas
        if (Platform.OS === 'ios' && !hasLoadedOnce) {
            loadStories(false); // Carregar sem force reload
            setHasLoadedOnce(true);
        } else if (Platform.OS !== 'ios') {
            loadStories();
        }
    }, [hasLoadedOnce]);

    // ✨ Auto-renovação: Verifica cache expirado a cada 1 minuto
    useEffect(() => {
        const checkCacheExpiration = async () => {
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    const cacheTimestamp = cacheData.timestamp || 0;
                    const cacheAge = Date.now() - cacheTimestamp;

                    // Se cache expirou (>10 min), recarregar automaticamente
                    if (cacheAge > CACHE_DURATION) {
                        await loadStories(false);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao verificar expiração do cache:', error);
            }
        };

        // Verificar a cada 1 minuto (60000ms)
        const interval = setInterval(checkCacheExpiration, 60 * 1000);

        // Cleanup: Limpar interval ao desmontar componente
        return () => clearInterval(interval);
    }, []); // Só cria o interval uma vez

    // Recarregar stories quando voltar para a tela (otimizado para iOS)
    useFocusEffect(
        React.useCallback(() => {
            // No iOS, não recarregar automaticamente para evitar piscadas
            if (Platform.OS !== 'ios') {
                loadStories(false); // false = não force reload, mas sempre verifica
            }
        }, [])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Recarregar stories sem limpar cache de mídia
        loadStories(true).finally(() => setRefreshing(false));
    }, []);



    const loadStories = async (forceReload = false) => {
        try {
            setLoading(true);

            // Sempre verificar se há novos stories, mesmo com cache
            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            // Buscar stories do Supabase primeiro (mais recentes primeiro)
            const { data: supabaseStories, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .gte('created_at', cutoffDate)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('❌ Erro ao carregar stories do Supabase:', error);
                return;
            }

            const currentStories = supabaseStories || [];

            // Se não for forceReload, verificar se o cache está atualizado
            if (!forceReload) {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    const cachedStories = cacheData.stories || cacheData; // Suporte para cache antigo
                    const cacheTimestamp = cacheData.timestamp || 0;
                    const cacheAge = Date.now() - cacheTimestamp;
                    
                    // ✨ Verificar se cache expirou (10 minutos)
                    const isCacheExpired = cacheAge > CACHE_DURATION;

                    if (!isCacheExpired) {
                        // Verificar se o cache está sincronizado com o Supabase
                        const cachedIds = cachedStories.map(s => s.id).sort();
                        const currentIds = currentStories.map(s => s.id).sort();

                        const isCacheValid = JSON.stringify(cachedIds) === JSON.stringify(currentIds);

                        if (isCacheValid && cachedStories.length === currentStories.length) {
                            setStories(cachedStories);
                            setLoading(false);
                            return;
                        }
                    }
                }
            }

            // Pré-carregar imagens das bolhas em background
            preloadStoryImages(currentStories);

            // Atualizar o estado e o cache com os stories atuais
            setStories(currentStories);

            // ✨ Salvar no cache com timestamp
            const cacheData = {
                stories: currentStories,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        } catch (error) {
            console.error('❌ Erro ao carregar stories:', error);
        } finally {
            setLoading(false);
        }
    };

    // Pré-carregar imagens das bolhas de stories
    const preloadStoryImages = async (stories) => {
        try {
            // Limpar cache antigo em background
            cleanupOldCache();

            // Pré-carregar imagens para cada story
            const preloadPromises = stories.map(async (story) => {
                try {
                    const displayImage = story.media_type === 'video'
                        ? story.thumbnail_url
                        : story.image_url;

                    if (displayImage) {
                        await getOptimizedUrl(displayImage, 'thumbnail');
                    }
                } catch (error) {
                    console.error('❌ Erro ao pré-carregar imagem:', error);
                }
            });

            await Promise.allSettled(preloadPromises);
        } catch (error) {
            console.error('❌ Erro no pré-carregamento de imagens:', error);
        }
    };

    const handleCreateStory = () => {
        if (!isAdmin) {
            Alert.alert('Acesso Negado', 'Apenas administradores podem criar stories.');
            return;
        }
        navigation.navigate('CreateStory');
    };

    const handleStoryPress = (story) => {
        const storyIndex = stories.findIndex(s => s.id === story.id);
        navigation.navigate('StoryViewer', { initialStoryIndex: storyIndex });
    };

    const renderStoryItem = (story) => {
        return <StoryItem key={story.id} story={story} onPress={() => handleStoryPress(story)} />;
    };

    const renderCreateStoryButton = () => (
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory}>
            <View style={[styles.storyCircle, styles.createStoryCircle]}>
                <Ionicons name="add" size={30} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Carregando stories...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {isAdmin && renderCreateStoryButton()}

                {stories.map((story) => renderStoryItem(story))}

                {stories.length === 0 && !isAdmin && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Nenhum story disponível</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 0,
        height: 80, // Altura reduzida já que removemos o header
        overflow: 'hidden', // Evita que o conteúdo extrapole
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
    storiesContainer: {
        paddingHorizontal: 5,
        gap: 5,
        height: 80, // Altura fixa para o container dos stories
        alignItems: 'center', // Centralizar verticalmente
    },
    storyItem: { alignItems: 'center', width: STORY_SIZE + 5 },
    storyCircle: {
        width: STORY_SIZE,
        height: STORY_SIZE,
        borderRadius: STORY_SIZE / 2,
        borderWidth: 3,
        borderColor: '#00335e',
        overflow: 'hidden',
        marginBottom: 8,
    },
    createStoryCircle: {
        backgroundColor: '#00335e',
        borderColor: '#00335e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyImage: { width: '100%', height: '100%' },
    storyTitle: { fontSize: 12, color: '#2c3e50', textAlign: 'center', fontWeight: '500' },
    loadingText: {
        textAlign: 'center',
        color: '#00335e', // Cor mais escura para contrastar com o fundo amarelo
        marginVertical: 20,
        fontWeight: '500', // Deixar um pouco mais bold para melhor visibilidade
    },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    emptyText: { color: '#7f8c8d', fontSize: 14 },
});

// Componente separado para o item do story
const StoryItem = ({ story, onPress }) => {
    const [optimizedImageUrl, setOptimizedImageUrl] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);

    const displayImage = story.media_type === 'video'
        ? story.thumbnail_url   // usa thumbnail para vídeo
        : story.image_url;      // usa a própria imagem

    // Carregar URL otimizada quando o componente montar
    useEffect(() => {
        if (displayImage) {
            getOptimizedUrl(displayImage, 'thumbnail')
                .then(url => {
                    setOptimizedImageUrl(url);
                    setImageLoading(false);
                })
                .catch(() => {
                    setOptimizedImageUrl(displayImage); // Fallback
                    setImageLoading(false);
                });
        } else {
            setImageLoading(false);
        }
    }, [displayImage]);

    return (
        <TouchableOpacity
            style={styles.storyItem}
            onPress={onPress}
        >
            <View style={styles.storyCircle}>
                {displayImage && optimizedImageUrl ? (
                    <Image
                        source={{ uri: optimizedImageUrl }}
                        style={styles.storyImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.storyCircle, { backgroundColor: '#ccc' }]} />
                )}
            </View>
            {/* <Text style={styles.storyTitle} numberOfLines={1}>
                {story.title}
            </Text> */}
        </TouchableOpacity>
    );
};
