import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    FlatList,
    Image,
    TextInput,
    Modal,
    ScrollView,
    RefreshControl,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');



export default function HomeScreen({ navigation }) {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        city: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
    });
    const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
            fetchProperties();
            fetchStories();
        }
    }, [user?.id]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar perfil:', error);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error);
        }
    };

    const fetchProperties = async (customFilters = null) => {
        try {
            let query = supabase
                .from('properties')
                .select('*, images')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            const activeFilters = customFilters || filters;

            if (activeFilters.city) {
                query = query.ilike('city', `%${activeFilters.city}%`);
            }
            if (activeFilters.propertyType) {
                query = query.eq('property_type', activeFilters.propertyType);
            }
            if (activeFilters.minPrice) {
                query = query.gte('price', parseFloat(activeFilters.minPrice));
            }
            if (activeFilters.maxPrice) {
                query = query.lte('price', parseFloat(activeFilters.maxPrice));
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro ao buscar imóveis:', error);
                Alert.alert('Erro', 'Não foi possível carregar os anúncios');
            } else {
                setProperties(data || []);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar imóveis:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStories = async () => {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .order('order_index', { ascending: true });

            if (error) {
                console.error('❌ Erro ao buscar stories:', error);
            } else {
                setStories(data || []);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar stories:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchProperties(),
            fetchStories(),
            fetchProfile()
        ]);
        setRefreshing(false);
    };

    const clearFilters = () => {
        const clearedFilters = {
            city: '',
            propertyType: '',
            minPrice: '',
            maxPrice: '',
        };
        setFilters(clearedFilters);
        fetchProperties(clearedFilters);
    };

    const applyFilters = () => {
        fetchProperties();
        setShowFilters(false);
    };



    const renderStory = ({ item }) => (
        <TouchableOpacity style={styles.storyCard}>
            <Image
                source={{ uri: item.image_url || 'https://via.placeholder.com/80x80' }}
                style={styles.storyImage}
                resizeMode="cover"
            />
            <Text style={styles.storyTitle} numberOfLines={2}>
                {item.title}
            </Text>
        </TouchableOpacity>
    );

    const renderProperty = ({ item, index }) => {
        const mediaFiles = item.images || [];
        const currentIndex = currentImageIndex[index] || 0;

        // Filtrar apenas imagens (excluir vídeos)
        const imageFiles = mediaFiles.filter(file =>
            !file.includes('.mp4') &&
            !file.includes('.mov') &&
            !file.includes('.avi') &&
            !file.includes('.mkv') &&
            !file.includes('.webm')
        );

        const hasMultipleMedia = imageFiles.length > 1;

        // Fallback para quando não há imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayMediaFiles = imageFiles.length > 0 ? imageFiles : [defaultImage];

        const handleImageScroll = (event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const imageIndex = Math.round(contentOffset / (width - 40)); // 40 é o padding
            setCurrentImageIndex(prev => ({
                ...prev,
                [index]: imageIndex
            }));
        };

        const renderMediaItem = ({ item: mediaItem, mediaIndex }) => {
            return (
                <Image
                    source={{ uri: mediaItem }}
                    style={styles.mediaItem}
                    resizeMode="cover"
                />
            );
        };

        return (
            <View style={styles.propertyCard}>
                <View style={styles.mediaSection}>
                    <FlatList
                        data={displayMediaFiles}
                        renderItem={renderMediaItem}
                        keyExtractor={(mediaItem, mediaIndex) => `${index}-${mediaIndex}`}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleImageScroll}
                        scrollEventThrottle={16}
                        style={styles.mediaList}
                        nestedScrollEnabled={true}
                        scrollEnabled={true}
                        bounces={false}
                        decelerationRate="fast"
                    />

                    {/* Indicadores de múltiplas imagens */}
                    {hasMultipleMedia && (
                        <View style={styles.mediaIndicators}>
                            {displayMediaFiles.map((_, mediaIndex) => (
                                <View
                                    key={mediaIndex}
                                    style={[
                                        styles.mediaIndicator,
                                        mediaIndex === currentIndex && styles.mediaIndicatorActive
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Indicador de quantidade de mídias */}
                    {hasMultipleMedia && (
                        <View style={styles.mediaCountBadge}>
                            <Text style={styles.mediaCountText}>
                                {currentIndex + 1}/{displayMediaFiles.length}
                            </Text>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.propertyInfo}
                    onPress={() => {
                        // Navegação para página de detalhes do imóvel
                        // TODO: Implementar PropertyDetailsScreen
                        Alert.alert(
                            'Detalhes do Imóvel',
                            `Página de detalhes para: ${item.title}\n\nEm breve será implementada!`,
                            [{ text: 'OK' }]
                        );
                    }}
                    activeOpacity={0.7}
                    delayPressIn={150}
                    delayLongPress={500}
                >
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.propertyLocation}>
                        {item.neighborhood}, {item.city}
                    </Text>
                    <View style={styles.propertyDetails}>
                        <Text style={styles.propertyPrice}>
                            R$ {item.price?.toLocaleString('pt-BR')}
                        </Text>
                        <View style={styles.propertyFeatures}>
                            {item.bedrooms && (
                                <Text style={styles.propertyFeature}>
                                    {item.bedrooms} quartos
                                </Text>
                            )}
                            {item.bathrooms && (
                                <Text style={styles.propertyFeature}>
                                    {item.bathrooms} banheiros
                                </Text>
                            )}
                            {item.area && (
                                <Text style={styles.propertyFeature}>
                                    {item.area}m²
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text style={styles.propertyType}>
                        {item.property_type} • {item.transaction_type}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderFilterModal = () => (
        <Modal
            visible={showFilters}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFilters(false)}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filtros</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Ionicons name="close" size={24} color="#2c3e50" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.filtersContainer}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Cidade</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={filters.city}
                                onChangeText={(text) => setFilters({ ...filters, city: text })}
                                placeholder="Digite a cidade"
                                placeholderTextColor="#7f8c8d"
                            />
                        </View>

                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Tipo de Imóvel</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={filters.propertyType}
                                onChangeText={(text) => setFilters({ ...filters, propertyType: text })}
                                placeholder="Casa, Apartamento, etc."
                                placeholderTextColor="#7f8c8d"
                            />
                        </View>

                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Preço Mínimo</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={filters.minPrice}
                                onChangeText={(text) => setFilters({ ...filters, minPrice: text })}
                                placeholder="R$ 0"
                                placeholderTextColor="#7f8c8d"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.filterGroup}>
                            <Text style={styles.filterLabel}>Preço Máximo</Text>
                            <TextInput
                                style={styles.filterInput}
                                value={filters.maxPrice}
                                onChangeText={(text) => setFilters({ ...filters, maxPrice: text })}
                                placeholder="R$ 1.000.000"
                                placeholderTextColor="#7f8c8d"
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.filterButtons}>
                            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                                <Text style={styles.clearButtonText}>Ver Todos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                                <Text style={styles.applyButtonText}>Aplicar</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerIcon}>
                        <Ionicons name="home" size={30} color="#fff" />
                    </View>
                    <Text style={styles.title}>BuscaBusca Imóveis</Text>
                    <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
                        <Ionicons name="filter" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.welcome}>
                    Bem-vindo, {profile?.full_name || user?.email || 'Usuário'}!
                </Text>
            </View>

            {/* Content */}
            <FlatList
                data={properties}
                renderItem={renderProperty}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <>
                        {/* Stories */}
                        {stories.length > 0 && (
                            <View style={styles.storiesSection}>
                                <Text style={styles.sectionTitle}>Destaques</Text>
                                <FlatList
                                    data={stories}
                                    renderItem={renderStory}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.storiesList}
                                />
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('CreateAd')}
                            >
                                <Ionicons name="add-circle" size={20} color="#3498db" />
                                <Text style={styles.actionButtonText}>Criar Anúncio</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('Plans')}
                            >
                                <Ionicons name="card" size={20} color="#f39c12" />
                                <Text style={styles.actionButtonText}>Ver Planos</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Properties Section */}
                        <View style={styles.propertiesSection}>
                            <Text style={styles.sectionTitle}>
                                Anúncios ({properties.length})
                            </Text>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                        <Text style={styles.emptyText}>Nenhum anúncio encontrado</Text>
                        <Text style={styles.emptySubtext}>
                            Tente ajustar os filtros ou volte mais tarde
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContainer}
            />





            {/* Filter Modal */}
            {renderFilterModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#3498db',
        padding: 20,
        paddingTop: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    headerIcon: {
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 25,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    filterButton: {
        padding: 5,
    },
    welcome: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    listContainer: {
        paddingBottom: 80,
    },
    storiesSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    storiesList: {
        paddingHorizontal: 20,
    },
    storyCard: {
        width: 80,
        marginRight: 15,
        alignItems: 'center',
    },
    storyImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
    },
    storyTitle: {
        fontSize: 12,
        color: '#2c3e50',
        textAlign: 'center',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    actionButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    actionButtonText: {
        color: '#2c3e50',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    propertiesSection: {
        marginBottom: 10,
    },
    propertyCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    // Media Gallery Styles
    mediaSection: {
        position: 'relative',
        height: 200,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        overflow: 'hidden',
    },
    mediaList: {
        height: 200,
    },
    mediaItem: {
        width: width - 40, // 40 é o padding horizontal
        height: 200,
    },

    mediaIndicators: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        right: 15,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    mediaIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    mediaIndicatorActive: {
        backgroundColor: '#fff',
        width: 20,
    },
    mediaCountBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    mediaCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    propertyInfo: {
        padding: 15,
        backgroundColor: '#fff',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 10,
    },
    propertyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    propertyPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
    },
    propertyFeatures: {
        flexDirection: 'row',
        gap: 10,
    },
    propertyFeature: {
        fontSize: 12,
        color: '#7f8c8d',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    propertyType: {
        fontSize: 12,
        color: '#7f8c8d',
        textTransform: 'capitalize',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyText: {
        fontSize: 18,
        color: '#7f8c8d',
        marginTop: 15,
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#bdc3c7',
        textAlign: 'center',
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    filtersContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    filterGroup: {
        marginBottom: 20,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#2c3e50',
        backgroundColor: '#fff',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
    },
    clearButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },


}); 