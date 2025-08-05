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
    useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');



export default function HomeScreen({ navigation }) {
    const { user, signOut } = useAuth();
    const colorScheme = useColorScheme();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        city: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
    });
    const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [selectedStory, setSelectedStory] = useState(null);
    const [favorites, setFavorites] = useState({});

    // Cores dinâmicas baseadas no tema do dispositivo
    const colors = {
        headerBg: '#ffffff', // Header sempre branco
        headerBorder: '#e2e8f0',
        textPrimary: '#1e3a8a',
        textSecondary: '#64748b',
        buttonBg: '#1e3a8a',
        buttonText: '#ffffff',
    };

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
            fetchProperties();
            fetchStories();
            fetchFavorites();
        }
    }, [user?.id]);

    // Sincronizar favoritos quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                fetchFavorites();
            }
        }, [user?.id])
    );

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

    const fetchProperties = async (customFilters = null, searchQuery = null) => {
        try {
            let query = supabase
                .from('properties')
                .select('*, images')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            const activeFilters = customFilters || filters;
            const activeSearch = searchQuery !== null ? searchQuery : searchTerm;

            // Aplicar pesquisa
            if (activeSearch) {
                query = query.or(`title.ilike.%${activeSearch}%,city.ilike.%${activeSearch}%,neighborhood.ilike.%${activeSearch}%`);
            }

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
                // Se não há stories no banco, usar dados de exemplo
                if (!data || data.length === 0) {
                    const sampleStories = [
                        {
                            id: '1',
                            title: 'Novos Lançamentos',
                            image_url: 'https://via.placeholder.com/80x80/1e3a8a/ffffff?text=NL',
                            description: 'Confira os novos lançamentos exclusivos'
                        },
                        {
                            id: '2',
                            title: 'Ofertas Especiais',
                            image_url: 'https://via.placeholder.com/80x80/f59e0b/ffffff?text=OE',
                            description: 'Ofertas imperdíveis para você'
                        },
                        {
                            id: '3',
                            title: 'Área Premium',
                            image_url: 'https://via.placeholder.com/80x80/059669/ffffff?text=AP',
                            description: 'Imóveis em áreas nobres da cidade'
                        },
                        {
                            id: '4',
                            title: 'Financiamento',
                            image_url: 'https://via.placeholder.com/80x80/dc2626/ffffff?text=FIN',
                            description: 'Condições especiais de financiamento'
                        },
                        {
                            id: '5',
                            title: 'Plantão',
                            image_url: 'https://via.placeholder.com/80x80/7c3aed/ffffff?text=PL',
                            description: 'Plantão de vendas 24h'
                        }
                    ];
                    setStories(sampleStories);
                } else {
                    setStories(data);
                }
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
            fetchProfile(),
            fetchFavorites()
        ]);
        setRefreshing(false);
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        fetchProperties(filters, text);
    };

    const clearSearch = () => {
        setSearchTerm('');
        fetchProperties(filters, '');
    };

    const clearFilters = () => {
        const clearedFilters = {
            city: '',
            propertyType: '',
            minPrice: '',
            maxPrice: '',
        };
        setFilters(clearedFilters);
        fetchProperties(clearedFilters, searchTerm);
    };

    const applyFilters = () => {
        fetchProperties(filters, searchTerm);
        setShowFilters(false);
    };

    const openStoryModal = (story) => {
        setSelectedStory(story);
        setShowStoryModal(true);
    };

    const closeStoryModal = () => {
        setShowStoryModal(false);
        setSelectedStory(null);
    };

    const fetchFavorites = async () => {
        if (!user?.id) return;

        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('property_id')
                .eq('user_id', user.id);

            if (error) {
                console.error('❌ Erro ao buscar favoritos:', error);
            } else {
                const favoritesMap = {};
                data.forEach(fav => {
                    favoritesMap[fav.property_id] = true;
                });
                setFavorites(favoritesMap);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar favoritos:', error);
        }
    };

    const toggleFavorite = async (propertyId) => {
        if (!user?.id) {
            Alert.alert('Atenção', 'Você precisa estar logado para favoritar imóveis');
            return;
        }

        try {
            if (favorites[propertyId]) {
                // Remover dos favoritos
                const { error } = await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('property_id', propertyId);

                if (error) {
                    console.error('❌ Erro ao remover favorito:', error);
                    Alert.alert('Erro', 'Não foi possível remover dos favoritos');
                } else {
                    setFavorites(prev => ({ ...prev, [propertyId]: false }));
                }
            } else {
                // Adicionar aos favoritos
                const { error } = await supabase
                    .from('favorites')
                    .insert({
                        user_id: user.id,
                        property_id: propertyId,
                    });

                if (error) {
                    console.error('❌ Erro ao adicionar favorito:', error);
                    Alert.alert('Erro', 'Não foi possível adicionar aos favoritos');
                } else {
                    setFavorites(prev => ({ ...prev, [propertyId]: true }));
                }
            }
        } catch (error) {
            console.error('❌ Erro ao gerenciar favorito:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        }
    };



    const renderStory = ({ item }) => (
        <TouchableOpacity
            style={styles.storyCard}
            onPress={() => openStoryModal(item)}
            activeOpacity={0.7}
        >
            <View style={styles.storyImageContainer}>
                <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/80x80?text=Story' }}
                    style={styles.storyImage}
                    resizeMode="cover"
                />
                {!item.image_url && (
                    <View style={styles.storyPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#1e3a8a" />
                    </View>
                )}
                {/* Borda colorida ao redor da bolha */}
                <View style={styles.storyBorder} />
            </View>
            <Text style={styles.storyTitle} numberOfLines={2}>
                {item.title || 'Story em Destaque'}
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

                    {/* Botão de Favoritos */}
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={() => toggleFavorite(item.id)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={favorites[item.id] ? "heart" : "heart-outline"}
                            size={24}
                            color={favorites[item.id] ? "#dc2626" : "#fff"}
                        />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.propertyInfo}
                    onPress={() => {
                        navigation.navigate('PropertyDetails', { property: item });
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

    const renderStoryModal = () => (
        <Modal
            visible={showStoryModal}
            transparent={true}
            animationType="fade"
            onRequestClose={closeStoryModal}
        >
            <View style={styles.storyModalOverlay}>
                <TouchableOpacity
                    style={styles.storyModalCloseButton}
                    onPress={closeStoryModal}
                >
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>

                <View style={styles.storyModalContent}>
                    <Image
                        source={{
                            uri: selectedStory?.image_url || 'https://via.placeholder.com/400x600?text=Story+Image'
                        }}
                        style={styles.storyModalImage}
                        resizeMode="contain"
                    />
                    {selectedStory?.title && (
                        <View style={styles.storyModalInfo}>
                            <Text style={styles.storyModalTitle}>
                                {selectedStory.title}
                            </Text>
                            {selectedStory?.description && (
                                <Text style={styles.storyModalDescription}>
                                    {selectedStory.description}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );

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
                {/* Nome do app - pequeno e acima da barra de pesquisa */}
                <Text style={styles.appTitle}>BuscaBusca Imóveis</Text>

                {/* Primeira linha: Logo + Barra de Pesquisa */}
                <View style={styles.headerTop}>
                    <View style={styles.headerLogo}>
                        <Image
                            source={require('../assets/logo_bb.jpg')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Barra de Pesquisa */}
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Buscar imóveis..."
                            placeholderTextColor="#7f8c8d"
                            value={searchTerm}
                            onChangeText={handleSearch}
                            returnKeyType="search"
                        />
                        {searchTerm.length > 0 && (
                            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                                <Ionicons name="close-circle" size={20} color="#7f8c8d" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Segunda linha: Filtros + Ver Mapa + Ordenar */}
                <View style={styles.headerBottom}>
                    <View style={styles.leftButtons}>
                        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
                            <Ionicons name="filter" size={20} color="#fff" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                            <Text style={styles.clearFiltersText}>Limpar Filtros</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="map" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Ver Mapa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="swap-vertical" size={18} color="#fff" />
                            <Text style={styles.actionButtonText}>Ordenar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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

            {/* Story Modal */}
            {renderStoryModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        padding: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    headerLogo: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    filterButton: {
        borderRadius: 20,
        padding: 10,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e3a8a',
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
        marginTop: 5,
        marginBottom: 15,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e3a8a',
        marginBottom: 5,
        paddingHorizontal: 20,
    },
    storiesList: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    storyCard: {
        width: 80,
        marginRight: 15,
        alignItems: 'center',
        paddingTop: 5,
    },
    storyImageContainer: {
        position: 'relative',
        marginBottom: 8,
        width: 70,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
    },
    storyImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#fff',
    },
    storyPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f1f5f9',
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderStyle: 'dashed',
    },
    storyBorder: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 37,
        borderWidth: 2,
        borderColor: '#1e3a8a',
        backgroundColor: 'transparent',
    },
    storyTitle: {
        fontSize: 12,
        color: '#1e3a8a',
        textAlign: 'center',
        fontWeight: '500',
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
    favoriteButton: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
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
        color: '#1e3a8a',
        marginBottom: 5,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#64748b',
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
        color: '#059669',
    },
    propertyFeatures: {
        flexDirection: 'row',
        gap: 10,
    },
    propertyFeature: {
        fontSize: 12,
        color: '#64748b',
        backgroundColor: '#f1f5f9',
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
        color: '#1e3a8a',
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
        color: '#1e3a8a',
        marginBottom: 8,
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1e3a8a',
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
        borderColor: '#1e3a8a',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#1e3a8a',
        fontSize: 16,
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        backgroundColor: '#1e3a8a',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },


    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1e3a8a',
    },
    clearSearchButton: {
        padding: 5,
    },

    appTitle: {
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        marginBottom: 10,
        color: '#1e3a8a',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    leftButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        gap: 5,
        backgroundColor: '#1e3a8a',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    clearFiltersButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    clearFiltersText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1e3a8a',
    },

    // Story Modal Styles
    storyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    storyModalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 10,
    },
    storyModalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    storyModalImage: {
        width: '100%',
        height: '70%',
        borderRadius: 12,
    },
    storyModalInfo: {
        marginTop: 20,
        alignItems: 'center',
        maxWidth: '80%',
    },
    storyModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    storyModalDescription: {
        fontSize: 16,
        color: '#e2e8f0',
        textAlign: 'center',
        lineHeight: 24,
    },

}); 