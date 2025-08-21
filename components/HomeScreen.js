import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    FlatList,
    TextInput,
    Modal,
    ScrollView,
    RefreshControl,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PropertyCacheService from '../lib/propertyCacheService';
import StoriesComponent from './StoriesComponent';

const { width } = Dimensions.get('window');



export default function HomeScreen({ navigation }) {
    console.log('Rendere HomeScreen');

    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        city: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
    });
    const [selectedPropertyIndex, setSelectedPropertyIndex] = useState(null);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [selectedStory, setSelectedStory] = useState(null);
    const [favorites, setFavorites] = useState({});

    // Estados para lazy loading
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [cacheStats, setCacheStats] = useState(null);

    // Cores dinâmicas baseadas no tema do dispositivo
    const colors = {
        headerBg: '#ffffff', // Header sempre branco
        headerBorder: '#e2e8f0',
        textPrimary: '#00335e',
        textSecondary: '#64748b',
        buttonBg: '#00335e',
        buttonText: '#ffffff',
    };

    useEffect(() => {
        if (user?.id) {
            console.log('👤👤👤 HomeScreen: USUÁRIO DETECTADO, CARREGANDO DADOS INICIAIS 👤👤👤');
            fetchProfile();
            fetchProperties();
            fetchFavorites();
        }
    }, [user?.id]);

    // Sincronizar favoritos quando a tela receber foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                console.log('🎯🎯🎯 HomeScreen: TELA RECEBEU FOCO, SINCRONIZANDO FAVORITOS 🎯🎯🎯');
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

    const fetchProperties = async (customFilters = null, searchQuery = null, page = 0, forceRefresh = false) => {
        console.log('🏠🏠🏠 HomeScreen: INICIANDO FETCHPROPERTIES 🏠🏠🏠');
        console.log('📋 Parâmetros:', { customFilters, searchQuery, page, forceRefresh });

        try {
            const activeFilters = customFilters || filters;
            const activeSearch = searchQuery !== null ? searchQuery : searchTerm;

            console.log('🔍 HomeScreen: Chamando PropertyCacheService.getProperties');
            const result = await PropertyCacheService.getProperties({
                page,
                filters: activeFilters,
                searchTerm: activeSearch,
                forceRefresh
            });

            console.log('✅✅✅ HomeScreen: RESULTADO RECEBIDO DO PropertyCacheService ✅✅✅');
            console.log('📊 Dados:', {
                fromCache: result.fromCache,
                totalCount: result.totalCount,
                hasMore: result.hasMore,
                dataLength: result.data.length,
                page: page
            });

            if (result.fromCache) {
                console.log('📦📦📦 HomeScreen: DADOS CARREGADOS DO CACHE 📦📦📦');
                if (result.cacheInfo) {
                    console.log('📦 Cache Info:', result.cacheInfo);
                }
            } else {
                console.log('🌐🌐🌐 HomeScreen: DADOS CARREGADOS DO SERVIDOR 🌐🌐🌐');
                if (result.serverInfo) {
                    console.log('🌐 Server Info:', result.serverInfo);
                }
            }

            if (result.error) {
                console.log('⚠️ HomeScreen: Aviso - usando cache como fallback:', result.error);
            }

            if (page === 0) {
                // Primeira página - substituir dados
                console.log('🔄 HomeScreen: Substituindo dados (página 0)');
                setProperties(result.data);
            } else {
                // Páginas subsequentes - adicionar dados
                setProperties(prev => [...prev, ...result.data]);
            }

            setCurrentPage(page);
            setHasMore(result.hasMore);
            setTotalCount(result.totalCount);

            // Atualizar estatísticas do cache
            const stats = await PropertyCacheService.getCacheStats();
            setCacheStats(stats);
            console.log('📊 HomeScreen: Estatísticas do cache atualizadas:', stats);

        } catch (error) {
            console.error('❌❌❌ HomeScreen: ERRO AO BUSCAR IMÓVEIS ❌❌❌', error);
            Alert.alert('Erro', 'Não foi possível carregar os anúncios');
        } finally {
            setLoading(false);
            setLoadingMore(false);
            console.log('🏁🏁🏁 HomeScreen: FETCHPROPERTIES FINALIZADO 🏁🏁🏁');
        }
    };



    const onRefresh = async () => {
        console.log('🔄🔄🔄 HomeScreen: INICIANDO REFRESH MANUAL 🔄🔄🔄');
        setRefreshing(true);
        setCurrentPage(0);
        await Promise.all([
            fetchProperties(filters, searchTerm, 0, true), // Forçar refresh
            fetchProfile(),
            fetchFavorites()
        ]);
        setRefreshing(false);
        console.log('✅✅✅ HomeScreen: REFRESH MANUAL FINALIZADO ✅✅✅');
    };

    const handleSearch = (text) => {
        console.log(`🔍🔍🔍 HomeScreen: BUSCA INICIADA: "${text}" 🔍🔍🔍`);
        setSearchTerm(text);
        setCurrentPage(0);
        fetchProperties(filters, text, 0);
    };

    const clearSearch = () => {
        console.log('🧹🧹🧹 HomeScreen: LIMPANDO BUSCA 🧹🧹🧹');
        setSearchTerm('');
        setCurrentPage(0);
        fetchProperties(filters, '', 0);
    };

    const clearFilters = () => {
        console.log('🧹🧹🧹 HomeScreen: LIMPANDO FILTROS 🧹🧹🧹');
        const clearedFilters = {
            city: '',
            propertyType: '',
            minPrice: '',
            maxPrice: '',
        };
        setFilters(clearedFilters);
        setCurrentPage(0);
        fetchProperties(clearedFilters, searchTerm, 0);
    };

    const applyFilters = () => {
        console.log('🔧🔧🔧 HomeScreen: APLICANDO FILTROS 🔧🔧🔧', filters);
        setCurrentPage(0);
        fetchProperties(filters, searchTerm, 0);
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

    const loadMoreProperties = async () => {
        if (loadingMore || !hasMore) {
            console.log('⏸️⏸️⏸️ HomeScreen: LOADMORE IGNORADO ⏸️⏸️⏸️ - loadingMore:', loadingMore, 'hasMore:', hasMore);
            return;
        }

        console.log(`📄📄📄 HomeScreen: CARREGANDO MAIS PROPRIEDADES - PÁGINA ${currentPage + 1} 📄📄📄`);
        setLoadingMore(true);
        const nextPage = currentPage + 1;
        await fetchProperties(filters, searchTerm, nextPage);
    };

    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.loadingMoreContainer}>
                <Text style={styles.loadingMoreText}>Carregando mais anúncios...</Text>
            </View>
        );
    };




    // Componente otimizado para renderizar propriedades
    const PropertyItem = React.memo(({ item, index, favorites, toggleFavorite, navigation }) => {
        const mediaFiles = item.images || [];
        const [currentIndex, setCurrentIndex] = useState(0);

        // Separar imagens e vídeos
        const imageFiles = useMemo(() => mediaFiles.filter(file =>
            !file.includes('.mp4') &&
            !file.includes('.mov') &&
            !file.includes('.avi') &&
            !file.includes('.mkv') &&
            !file.includes('.webm')
        ), [mediaFiles]);

        const videoFiles = useMemo(() => mediaFiles.filter(file =>
            file.includes('.mp4') ||
            file.includes('.mov') ||
            file.includes('.avi') ||
            file.includes('.mkv') ||
            file.includes('.webm')
        ), [mediaFiles]);

        const hasMultipleMedia = imageFiles.length > 1;
        const hasVideos = videoFiles.length > 0;

        // Fallback para quando não há imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayMediaFiles = imageFiles.length > 0 ? imageFiles : [defaultImage];

        const handleImageScroll = useCallback((event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const imageIndex = Math.round(contentOffset / (width - 40)); // 40 é o padding
            setCurrentIndex(imageIndex);
        }, []);

        const renderMediaItem = useCallback(({ item: mediaItem, mediaIndex }) => {
            return (
                <Image
                    source={{ uri: mediaItem }}
                    style={styles.mediaItem}
                    contentFit="cover"
                    cachePolicy="disk"
                    placeholder={require('../assets/icon.png')}
                    transition={200}
                />
            );
        }, []);

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
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={3}
                        windowSize={5}
                        initialNumToRender={1}
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

                    {/* Ícones de tipo de mídia */}
                    {(imageFiles.length > 0 || videoFiles.length > 0) && (
                        <View style={styles.mediaTypeBadge}>
                            {imageFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="image" size={14} color="#fff" />
                                    <Text style={styles.mediaTypeText}>{imageFiles.length}</Text>
                                </View>
                            )}
                            {videoFiles.length > 0 && (
                                <View style={styles.mediaTypeItem}>
                                    <Ionicons name="videocam" size={14} color="#fff" />
                                    <Text style={styles.mediaTypeText}>{videoFiles.length}</Text>
                                </View>
                            )}
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

                <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                        {item.title ?? 'Título indisponível'}
                    </Text>

                    <Text style={styles.propertyLocation}>
                        {item.neighborhood ?? 'Bairro indisponível'}, {item.city ?? 'Cidade indisponível'}
                    </Text>
                    <View style={styles.propertyDetails}>
                        <Text style={styles.propertyPrice}>
                            R$ {item.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                        </Text>
                        <View style={styles.propertyFeatures}>
                            {item.bedrooms != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${item.bedrooms} quartos`}
                                </Text>
                            )}
                            {item.bathrooms != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${item.bathrooms} banheiros`}
                                </Text>
                            )}
                            {item.area != null && (
                                <Text style={styles.propertyFeature}>
                                    {`${item.area}m²`}
                                </Text>
                            )}
                        </View>
                    </View>
                    <Text style={styles.propertyType}>
                        {(item.property_type ?? '') + ' • ' + (item.transaction_type ?? '')}
                    </Text>
                </View>

                {/* Botão invisível para navegação - posicionado sobre a área de informações */}
                <TouchableOpacity
                    style={styles.propertyInfoTouchable}
                    onPress={() => {
                        navigation.navigate('PropertyDetails', { property: item });
                    }}
                    activeOpacity={0.7}
                    delayPressIn={150}
                    delayLongPress={500}
                />
            </View>
        );
    });

    const renderProperty = useCallback(({ item, index }) => {
        return (
            <PropertyItem
                item={item}
                index={index}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                navigation={navigation}
            />
        );
    }, [favorites, toggleFavorite, navigation]);

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
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Carregando...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.storiesContainer}>
                <View style={styles.titleContainer}>
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.storiesTitle}>Busca Busca Imóveis</Text>
                </View>
                <StoriesComponent navigation={navigation} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                {/* Nome do app - pequeno e acima da barra de pesquisa */}


                {/* Primeira linha: Barra de Pesquisa */}
                <View style={styles.headerTop}>
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
                        {/* Properties Section */}
                        <View style={styles.propertiesSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {`Anúncios (${totalCount})`}
                                </Text>
                            </View>
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
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={5}
                getItemLayout={(data, index) => ({
                    length: 300, // altura estimada de cada item
                    offset: 300 * index,
                    index,
                })}
                onEndReached={loadMoreProperties}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
            />

            {/* Filter Modal */}
            {renderFilterModal()}

            {/* Story Modal */}
            {renderStoryModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    storiesContainer: {
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#ffcc1e',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 5,
        paddingHorizontal: 20,
    },
    titleLogo: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    storiesTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
    },
    header: {
        padding: 15,
        paddingTop: 20,
        paddingBottom: 5,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLogo: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 60,
        height: 60,
        borderRadius: 20,
    },
    filterButton: {
        borderRadius: 20,
        padding: 10,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00335e',
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
        backgroundColor: '#fff',
    },
    storiesSection: {
        marginTop: 5,
        marginBottom: 15,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
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
        borderColor: '#00335e',
        backgroundColor: 'transparent',
    },
    storyTitle: {
        fontSize: 12,
        color: '#00335e',
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
        bottom: 15,
        left: 15,
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
    mediaTypeBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        gap: 8,
    },
    mediaTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 3,
        gap: 3,
    },
    mediaTypeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
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
    propertyInfoTouchable: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120, // Altura aproximada da área de informações
        backgroundColor: 'transparent',
        zIndex: 1,
    },

    propertyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
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
        color: '#00335e',
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
        color: '#00335e',
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
        borderColor: '#00335e',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    clearButtonText: {
        color: '#00335e',
        fontSize: 16,
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        backgroundColor: '#00335e',
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
        width: '100%',
        maxWidth: 400,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 15,
        paddingHorizontal: 15,
        paddingVertical: 0,
        height: 48,
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
        marginRight: 5,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#00335e',
        paddingVertical: 0,
        minHeight: 20,
        textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
    },
    clearSearchButton: {
        padding: 5,
    },

    appTitle: {
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        marginBottom: 10,
        color: '#00335e',
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    leftButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 10,
        gap: 5,
        backgroundColor: '#00335e',
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
        color: '#00335e',
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
        height: '80%',
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

    loadingMoreContainer: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    loadingMoreText: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    cacheInfo: {
        fontSize: 12,
        color: '#7f8c8d',
    },

}); 