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

export default function StoriesComponent({ navigation }) {
    const { isAdmin } = useAdmin();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStories();
    }, []);

    // Recarregar stories quando voltar para a tela
    useFocusEffect(
        React.useCallback(() => {
            // Sempre verificar se há novos stories quando voltar para a tela
            loadStories(false); // false = não force reload, mas sempre verifica
        }, [])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Limpar cache e recarregar
        clearCache().then(() => {
            loadStories(true).finally(() => setRefreshing(false));
        });
    }, []);

    // Função para limpar cache manualmente
    const clearCache = async () => {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            console.log('🗑️ Cache de stories limpo');
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    };

    const loadStories = async (forceReload = false) => {
        try {
            setLoading(true);
            console.log('🚀 Iniciando loadStories, forceReload:', forceReload);

            // Sempre verificar se há novos stories, mesmo com cache
            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            console.log('📅 Cutoff date:', cutoffDate);

            // Buscar stories do Supabase primeiro
            const { data: supabaseStories, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .gte('created_at', cutoffDate)
                .order('order_index', { ascending: true })
                .limit(10);

            if (error) {
                console.error('❌ Erro ao carregar stories do Supabase:', error);
                return;
            }

            const currentStories = supabaseStories || [];
            console.log('✅ Stories atuais do Supabase:', currentStories.length);
            console.log('✅ Supabase stories:', currentStories.map(s => ({ id: s.id, title: s.title, created_at: s.created_at, status: s.status })));

            // Se não for forceReload, verificar se o cache está atualizado
            if (!forceReload) {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const cachedStories = JSON.parse(cached);
                    console.log('📦 Stories do cache:', cachedStories.length);
                    console.log('📦 Cache stories:', cachedStories.map(s => ({ id: s.id, title: s.title, created_at: s.created_at })));

                    // Verificar se o cache está sincronizado com o Supabase
                    const cachedIds = cachedStories.map(s => s.id).sort();
                    const currentIds = currentStories.map(s => s.id).sort();

                    const isCacheValid = JSON.stringify(cachedIds) === JSON.stringify(currentIds);

                    if (isCacheValid && cachedStories.length === currentStories.length) {
                        console.log('✅ Cache está sincronizado, usando cache');
                        setStories(cachedStories);
                        setLoading(false);
                        return;
                    } else {
                        console.log('🔄 Cache desatualizado, atualizando...');
                        console.log('📊 Cache IDs:', cachedIds);
                        console.log('📊 Current IDs:', currentIds);
                    }
                } else {
                    console.log('📦 Nenhum cache encontrado');
                }
            }

            // Pré-carregar imagens das bolhas em background
            preloadStoryImages(currentStories);

            // Atualizar o estado e o cache com os stories atuais
            setStories(currentStories);

            // Salvar no cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(currentStories));
            console.log('💾 Stories salvos no cache:', currentStories.length);
            console.log('💾 Cache content:', currentStories.map(s => ({ id: s.id, title: s.title, created_at: s.created_at })));

        } catch (error) {
            console.error('❌ Erro ao carregar stories:', error);
        } finally {
            setLoading(false);
        }
    };

    // Pré-carregar imagens das bolhas de stories
    const preloadStoryImages = async (stories) => {
        try {
            console.log('🖼️ Iniciando pré-carregamento de imagens das bolhas...');

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
            console.log('✅ Pré-carregamento de imagens concluído');

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
            <View style={styles.headerContainer}>
                {isAdmin && (
                    <View style={styles.adminButtons}>
                        <TouchableOpacity
                            style={styles.clearCacheButton}
                            onPress={() => {
                                clearCache();
                                loadStories(true);
                            }}
                        >
                            <Ionicons name="refresh" size={20} color="#e74c3c" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cacheStatsButton}
                            onPress={async () => {
                                const stats = await getCacheStats();
                                Alert.alert(
                                    'Estatísticas do Cache',
                                    `Arquivos: ${stats.totalFiles}\nTamanho: ${stats.totalSizeMB} MB`
                                );
                            }}
                        >
                            <Ionicons name="stats-chart" size={20} color="#3498db" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.clearMediaCacheButton}
                            onPress={async () => {
                                await clearAllCache();
                                Alert.alert('Cache Limpo', 'Todo o cache de mídia foi limpo');
                            }}
                        >
                            <Ionicons name="trash" size={20} color="#e67e22" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.verifyCacheButton}
                            onPress={async () => {
                                await verifyCacheIntegrity();
                                const stats = await getCacheStats();
                                Alert.alert(
                                    'Verificação do Cache',
                                    `Arquivos: ${stats.totalFiles}\nTamanho: ${stats.totalSizeMB} MB\n\nVerifique os logs para detalhes.`
                                );
                            }}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
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
    container: { marginVertical: 0 },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
        marginHorizontal: 10
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
    adminButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    clearCacheButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e74c3c',
    },
    cacheStatsButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#3498db',
    },
    clearMediaCacheButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e67e22',
    },
    verifyCacheButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#2ecc71',
    },
    storiesContainer: { paddingHorizontal: 5, gap: 5 },
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
    loadingText: { textAlign: 'center', color: '#7f8c8d', marginVertical: 20 },
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
