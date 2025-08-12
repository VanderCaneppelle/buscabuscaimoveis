import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Dimensions,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../contexts/AdminContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const STORY_SIZE = 70;

export default function StoriesComponent({ navigation }) {
    const { isAdmin } = useAdmin();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);

    console.log('🎬 StoriesComponent: isAdmin =', isAdmin);

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Erro ao carregar stories:', error);
            } else {
                setStories(data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar stories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStory = () => {
        if (!isAdmin) {
            Alert.alert('Acesso Negado', 'Apenas administradores podem criar stories.');
            return;
        }

        // TODO: Navegar para tela de criação de story
        Alert.alert('Criar Story', 'Funcionalidade em desenvolvimento!');
    };

    const handleStoryPress = (story) => {
        // TODO: Abrir visualizador de story
        Alert.alert('Story', `Visualizando: ${story.title}`);
    };

    const renderStoryItem = (story, index) => (
        <TouchableOpacity
            key={story.id}
            style={styles.storyItem}
            onPress={() => handleStoryPress(story)}
        >
            <View style={styles.storyCircle}>
                <Image
                    source={{ uri: story.image_url }}
                    style={styles.storyImage}
                    resizeMode="cover"
                />
            </View>
            <Text style={styles.storyTitle} numberOfLines={1}>
                {story.title}
            </Text>
        </TouchableOpacity>
    );

    const renderCreateStoryButton = () => {
        console.log('🎬 StoriesComponent: Renderizando botão de criar story');
        return (
            <TouchableOpacity
                style={styles.storyItem}
                onPress={handleCreateStory}
            >
                <View style={[styles.storyCircle, styles.createStoryCircle]}>
                    <Ionicons name="add" size={30} color="#fff" />
                </View>
                <Text style={styles.storyTitle} numberOfLines={1}>
                    Criar
                </Text>
            </TouchableOpacity>
        );
    };

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
            >
                {/* Botão de criar story (apenas para admins) */}
                {(() => {
                    console.log('🎬 StoriesComponent: Verificando se deve renderizar botão. isAdmin =', isAdmin);
                    return isAdmin && renderCreateStoryButton();
                })()}

                {/* Stories existentes */}
                {stories.map((story, index) => renderStoryItem(story, index))}

                {/* Placeholder se não há stories */}
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
        marginVertical: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        marginLeft: 20,
    },
    storiesContainer: {
        paddingHorizontal: 20,
        gap: 15,
    },
    storyItem: {
        alignItems: 'center',
        width: STORY_SIZE + 20,
    },
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
    storyImage: {
        width: '100%',
        height: '100%',
    },
    storyTitle: {
        fontSize: 12,
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingText: {
        textAlign: 'center',
        color: '#7f8c8d',
        marginVertical: 20,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        color: '#7f8c8d',
        fontSize: 14,
    },
}); 