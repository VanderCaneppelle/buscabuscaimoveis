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
            loadStories();
        }, [])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadStories(true).finally(() => setRefreshing(false));
    }, []);

    const loadStories = async (forceReload = false) => {
        try {
            setLoading(true);

            // Tentar carregar do cache
            if (!forceReload) {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const cachedStories = JSON.parse(cached);
                    console.log('📦 Stories carregados do cache:', cachedStories.length);
                    setStories(cachedStories);
                    setLoading(false);
                    return;
                }
            }

            console.log('🌐 Carregando stories do Supabase...');

            const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .gte('created_at', cutoffDate)
                .order('order_index', { ascending: true })
                .limit(10);

            if (error) {
                console.error('❌ Erro ao carregar stories:', error);
                return;
            }

            const loadedStories = data || [];
            console.log('✅ Stories carregados do Supabase:', loadedStories.length);

            setStories(loadedStories);

            // Salvar no cache
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(loadedStories));
            console.log('💾 Stories salvos no cache');

        } catch (error) {
            console.error('❌ Erro ao carregar stories:', error);
        } finally {
            setLoading(false);
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
        const displayImage = story.media_type === 'video'
            ? story.thumbnail_url   // usa thumbnail para vídeo
            : story.image_url;      // usa a própria imagem

        return (
            <TouchableOpacity
                key={story.id}
                style={styles.storyItem}
                onPress={() => handleStoryPress(story)}
            >
                <View style={styles.storyCircle}>
                    {displayImage ? (
                        <Image
                            source={{ uri: displayImage }}
                            style={styles.storyImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.storyCircle, { backgroundColor: '#ccc' }]} />
                    )}
                </View>
                <Text style={styles.storyTitle} numberOfLines={1}>
                    {story.title}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderCreateStoryButton = () => (
        <TouchableOpacity style={styles.storyItem} onPress={handleCreateStory}>
            <View style={[styles.storyCircle, styles.createStoryCircle]}>
                <Ionicons name="add" size={30} color="#fff" />
            </View>
            <Text style={styles.storyTitle} numberOfLines={1}>
                Criar
            </Text>
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
            <Text style={styles.sectionTitle}>Stories</Text>
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
    container: { marginVertical: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15, marginLeft: 20 },
    storiesContainer: { paddingHorizontal: 20, gap: 15 },
    storyItem: { alignItems: 'center', width: STORY_SIZE + 20 },
    storyCircle: {
        width: STORY_SIZE,
        height: STORY_SIZE,
        borderRadius: STORY_SIZE / 2,
        borderWidth: 3,
        borderColor: '#e74c3c',
        overflow: 'hidden',
        marginBottom: 8,
    },
    createStoryCircle: {
        backgroundColor: '#27ae60',
        borderColor: '#27ae60',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyImage: { width: '100%', height: '100%' },
    storyTitle: { fontSize: 12, color: '#2c3e50', textAlign: 'center', fontWeight: '500' },
    loadingText: { textAlign: 'center', color: '#7f8c8d', marginVertical: 20 },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
    emptyText: { color: '#7f8c8d', fontSize: 14 },
});
