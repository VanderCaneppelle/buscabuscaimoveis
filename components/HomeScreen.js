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
    console.log('🏠 HomeScreen: COMPONENTE MONTADO/RENDERIZADO');

    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        city: '',
        propertyType: '',
        minPrice: '',
        maxPrice: '',
    });
    const [favorites, setFavorites] = useState({});

    // Estados para lazy loading
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Estado para controlar dados
    const [hasInitialData, setHasInitialData] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0); // Manter posição do scroll

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
        console.log('🏠 HomeScreen: useEffect dados - user?.id:', !!user?.id, 'hasInitialData:', hasInitialData);
        if (user?.id && !hasInitialData) {
            console.log('👤👤👤 HomeScreen: USUÁRIO DETECTADO, CARREGANDO DADOS 👤👤👤');
            // Carregar dados apenas uma vez
            fetchProfile();
            fetchProperties();
            fetchFavorites();
            setHasInitialData(true);
        }
    }, [user?.id, hasInitialData]);

    // Detectar quando o componente é desmontado
    useEffect(() => {
        console.log('🏠 HomeScreen: COMPONENTE MONTADO - useEffect cleanup');
        return () => {
            console.log('🏠 HomeScreen: COMPONENTE DESMONTADO');
        };
    }, []);



    // Removido useFocusEffect para evitar recarregamento desnecessário
    // Os favoritos são carregados apenas na primeira montagem

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
        // Evitar recarregamento se já temos dados e não é forceRefresh
        if (page === 0 && properties.length > 0 && !forceRefresh && shouldRenderContent && hasInitialData) {
            console.log('🏠 HomeScreen: Dados já carregados, pulando fetchProperties');
            return;
        }

        console.log('🏠 HomeScreen: Carregando propriedades...');
        setLoading(true);

        try {
            const activeFilters = customFilters || filters;
            const activeSearch = searchQuery !== null ? searchQuery : searchTerm;

            const result = await PropertyCacheService.getProperties({
                page,
                filters: activeFilters,
                searchTerm: activeSearch,
                forceRefresh,
                enableParallelUpdate: false // Desabilitar atualização em background
            });

            if (page === 0) {
                setProperties(result.data);
            } else {
                setProperties(prev => [...prev, ...result.data]);
            }

            setCurrentPage(page);
            setHasMore(result.hasMore);
            setTotalCount(result.totalCount);

        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);
            Alert.alert('Erro', 'Não foi possível carregar os anúncios');
        } finally {
            setLoading(false);
            setLoadingMore(false);
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

    const toggleFavorite = useCallback(async (propertyId) => {
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
    }, [user?.id, favorites]);

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




    // Componente simplificado para renderizar propriedades
    const PropertyItem = React.memo(({ item, index, favorites, toggleFavorite, navigation }) => {
        // Memoizar o onPress para evitar re-renderizações
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: item });
        }, [navigation, item]);

        const handleFavoritePress = useCallback(() => {
            toggleFavorite(item.id);
        }, [toggleFavorite, item.id]);
        const mediaFiles = item.images || [];
        const [currentIndex, setCurrentIndex] = useState(0);

        // Separar imagens e vídeos (simplificado)
        const imageFiles = mediaFiles.filter(file =>
            !file.includes('.mp4') && !file.includes('.mov') && !file.includes('.avi') &&
            !file.includes('.mkv') && !file.includes('.webm')
        );

        const videoFiles = mediaFiles.filter(file =>
            file.includes('.mp4') || file.includes('.mov') || file.includes('.avi') ||
            file.includes('.mkv') || file.includes('.webm')
        );

        const hasMultipleMedia = imageFiles.length > 1;
        const hasVideos = videoFiles.length > 0;

        // Fallback para quando não há imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayMediaFiles = imageFiles.length > 0 ? imageFiles : [defaultImage];

        const handleImageScroll = useCallback((event) => {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const imageIndex = Math.round(contentOffset / (width - 40));
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
                    transition={0} // Remover transição para melhor performance
                    priority="low"
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
                        removeClippedSubviews={false}
                        maxToRenderPerBatch={1}
                        windowSize={3}
                        initialNumToRender={1}
                        updateCellsBatchingPeriod={100}
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
                        onPress={handleFavoritePress}
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

                    {/* Botão "Ver detalhes" para indicar que o card é clicável */}
                    <TouchableOpacity
                        style={styles.verDetalhesButton}
                        onPress={handlePress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.verDetalhesText}>Ver detalhes</Text>
                    </TouchableOpacity>
                </View>

            </View>
        );
    }, (prevProps, nextProps) => {
        // Comparação personalizada para evitar re-renderizações desnecessárias
        return (
            prevProps.item.id === nextProps.item.id &&
            prevProps.favorites[prevProps.item.id] === nextProps.favorites[nextProps.item.id] &&
            prevProps.index === nextProps.index
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



    const renderFilterModal = () => null; // Modal desabilitado para melhorar performance

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
                <View style={styles.storiesWrapper}>
                    <StoriesComponent navigation={navigation} />
                </View>
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
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    <View style={styles.propertiesSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>
                                {`Anúncios (${totalCount})`}
                            </Text>
                        </View>
                    </View>
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
                // Otimizações de performance
                removeClippedSubviews={false}
                maxToRenderPerBatch={3}
                windowSize={5}
                initialNumToRender={3}
                updateCellsBatchingPeriod={100}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                bounces={true}
                decelerationRate="normal"
                scrollEnabled={true}
                nestedScrollEnabled={true}
                maintainVisibleContentPosition={{
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 10,
                }}
                onEndReached={loadMoreProperties}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
            />


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
        height: 120, // Altura reduzida já que removemos os botões de admin
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
    verDetalhesButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    verDetalhesText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
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

    // Placeholder styles
    storiesPlaceholder: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    storiesPlaceholderFixed: {
        height: 80, // Altura reduzida para stories
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffcc1e', // Mesmo fundo amarelo do container
        marginHorizontal: 20,
        marginBottom: 10,
        // Removido borderWidth e borderColor para ficar sem borda
    },
    storiesWrapper: {
        height: 80, // Altura reduzida para o container dos stories
        overflow: 'hidden', // Evita que o conteúdo extrapole
    },
    contentPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffcc1e', // Mesmo fundo amarelo do container
        paddingHorizontal: 20,
    },
    placeholderText: {
        fontSize: 16,
        color: '#00335e', // Cor mais escura para contrastar com o fundo amarelo
        textAlign: 'center',
        fontWeight: '500', // Deixar um pouco mais bold para melhor visibilidade
    },

}); 