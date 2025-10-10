import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    FlatList,
    TextInput,
    ScrollView,
    RefreshControl,
    Dimensions,
    Platform,
    useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import FavoriteButton from './FavoriteButton';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useBoostsStore } from '../stores/boostsStore';
import { supabase } from '../lib/supabase';
import PropertyCacheService from '../lib/propertyCacheService';
import StoriesComponent from './StoriesComponent';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { FiltersModal } from './modals';

const { width } = Dimensions.get('window');

// FunÃ§Ã£o debounce para otimizar performance
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};



export default function HomeScreen({ navigation }) {
    // console.log('ðŸ  HomeScreen: COMPONENTE MONTADO/RENDERIZADO'); // Removido para evitar logs excessivos

    const { user, signOut } = useAuth();

    // Zustand: Favoritos
    const isFavorite = useFavoritesStore(state => state.isFavorite);
    const toggleFavorite = useFavoritesStore(state => state.toggleFavorite);
    const refreshFavorites = useFavoritesStore(state => state.refreshFavorites);
    const favoritesChanged = useFavoritesStore(state => state.favoritesChanged);
    const clearFavoritesChanged = useFavoritesStore(state => state.clearFavoritesChanged);

    // Zustand: Boosts
    const boostedPropertyIds = useBoostsStore(state => state.boostedPropertyIds);
    const fetchBoostedIds = useBoostsStore(state => state.fetchBoostedIds);
    const isBoosted = useBoostsStore(state => state.isBoosted);

    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const [profile, setProfile] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listLoading, setListLoading] = useState(false); // Loading apenas para a lista
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInputValue, setSearchInputValue] = useState(''); // Valor do input separado do termo de busca
    const [isSearching, setIsSearching] = useState(false); // Estado para indicar se estÃ¡ buscando
    const [filters, setFilters] = useState({
        city: '',
        propertyType: [],
        minPrice: '',
        maxPrice: '',
    });
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [tempFilters, setTempFilters] = useState({
        city: '',
        propertyType: [],
        minPrice: '',
        maxPrice: '',
    });
    // Estados para dropdown de cidades
    const [cities, setCities] = useState([]);

    // Estados para lazy loading
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Estado para controlar dados
    const [hasInitialData, setHasInitialData] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0); // Manter posiÃ§Ã£o do scroll

    // Refs para controle
    const searchInputRef = useRef(null);
    const flatListRef = useRef(null);

    // Cores dinÃ¢micas baseadas no tema do dispositivo
    const colors = {
        headerBg: '#ffffff', // Header sempre branco
        headerBorder: '#e2e8f0',
        textPrimary: '#00335e',
        textSecondary: '#64748b',
        buttonBg: '#00335e',
        buttonText: '#ffffff',
    };

    useEffect(() => {
        console.log('ðŸ  HomeScreen: useEffect dados - user?.id:', !!user?.id, 'hasInitialData:', hasInitialData);
        if (!hasInitialData) {
            console.log('ðŸ‘¤ðŸ‘¤ðŸ‘¤ HomeScreen: CARREGANDO DADOS INICIAIS ðŸ‘¤ðŸ‘¤ðŸ‘¤');
            // Carregar dados apenas uma vez
            if (user?.id) {
                fetchProfile();
            }
            fetchProperties();
            fetchCities(); // Buscar cidades disponÃ­veis
            setHasInitialData(true);
        }
    }, [user?.id, hasInitialData]);

    // Garantir que os dados sejam carregados quando a tela ganhar foco
    useFocusEffect(
        useCallback(() => {
            console.log('ðŸ  HomeScreen: TELA GANHOU FOCO');
            if (!hasInitialData) {
                console.log('ðŸ‘¤ðŸ‘¤ðŸ‘¤ HomeScreen: CARREGANDO DADOS NO FOCUS ðŸ‘¤ðŸ‘¤ðŸ‘¤');
                if (user?.id) {
                    fetchProfile();
                }
                fetchProperties();
                // ✅ Carregar boosts (com cache de 5 min)
                fetchBoostedIds();
                setHasInitialData(true);
            }
            // Recarregar favoritos APENAS se foram modificados em outra tela
            if (favoritesChanged) {
                console.log('[HomeScreen] Focus -> favoritesChanged=true. SKIP refreshFavorites (usar estado otimista)');
                clearFavoritesChanged();
            }
        }, [user?.id, hasInitialData, favoritesChanged, fetchBoostedIds])
    );

    // Detectar quando o componente Ã© desmontado
    useEffect(() => {
        console.log('ðŸ  HomeScreen: COMPONENTE MONTADO - useEffect cleanup');
        return () => {
            console.log('ðŸ  HomeScreen: COMPONENTE DESMONTADO');
        };
    }, []);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('âŒ Erro ao buscar perfil:', error);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error('âŒ Erro ao buscar perfil:', error);
        }
    };

    // ❌ REMOVIDO: fetchBoostedProperties - agora usa Zustand (useBoostsStore)

    const fetchProperties = async (customFilters = null, searchQuery = null, page = 0, forceRefresh = false, isSearchOrFilterChange = false) => {
        // Evitar recarregamento se jÃ¡ temos dados e nÃ£o Ã© forceRefresh
        // Mas sempre executar se for forceRefresh ou mudanÃ§a de busca/filtro
        if (page === 0 && properties.length > 0 && !forceRefresh && !isSearchOrFilterChange && hasInitialData) {
            console.log('  HomeScreen: Dados já carregados, pulando fetchProperties');
            return;
        }

        // Se nÃ£o temos dados iniciais e nÃ£o Ã© uma mudanÃ§a de filtro/busca, forÃ§ar carregamento
        if (page === 0 && !hasInitialData && !isSearchOrFilterChange) {
            console.log('  HomeScreen: Primeiro carregamento, forçando busca');
            forceRefresh = true;
        }

        console.log('  HomeScreen: Carregando propriedades...');
        console.log('  HomeScreen: Parâmetros:', { customFilters, searchQuery, page, forceRefresh, isSearchOrFilterChange });

        // Controlar loading baseado no tipo de operaÃ§Ã£o
        if (page === 0) {
            if (isSearchOrFilterChange) {
                setListLoading(true); // Loading apenas da lista (nÃ£o pisca a tela)
            } else {
                setLoading(true); // Loading da tela inteira (apenas na primeira vez)
            }
        }

        try {
            const activeFilters = customFilters || filters;
            const activeSearch = searchQuery !== null ? searchQuery : searchTerm;

            const result = await PropertyCacheService.getProperties({
                page,
                filters: activeFilters,
                searchTerm: activeSearch,
                forceRefresh,
                enableParallelUpdate: true // Habilitar atualizaÃ§Ã£o em background (SWR)
            });

            console.log('ðŸ  HomeScreen: Resultado recebido:', {
                dataLength: result.data?.length || 0,
                hasMore: result.hasMore,
                totalCount: result.totalCount
            });

            if (page === 0) {
                setProperties(result.data);
            } else {
                setProperties(prev => [...prev, ...result.data]);
            }

            setCurrentPage(page);
            setHasMore(result.hasMore);
            setTotalCount(result.totalCount);

            // ✅ Boosts são carregados uma vez no início via Zustand (cache de 5 min)
            // Não precisa buscar a cada paginação

        } catch (error) {
            console.error('âŒ Erro ao carregar propriedades:', error);
            Alert.alert('Erro', 'NÃ£o foi possÃ­vel carregar os anÃºncios');
        } finally {
            if (page === 0) {
                if (isSearchOrFilterChange) {
                    setListLoading(false);
                } else {
                    setLoading(false);
                }
            }
            setLoadingMore(false);
            setIsSearching(false);
        }
    };

    const onRefresh = async () => {
        console.log('ðŸ”„ðŸ”„ðŸ”„ HomeScreen: INICIANDO REFRESH MANUAL ðŸ”„ðŸ”„ðŸ”„');
        setRefreshing(true);
        setCurrentPage(0);
        await Promise.all([
            fetchProperties(filters, searchTerm, 0, true), // ForÃ§ar refresh
            fetchProfile()
        ]);
        setRefreshing(false);
        console.log('âœ…âœ…âœ… HomeScreen: REFRESH MANUAL FINALIZADO âœ…âœ…âœ…');
    };

    // Nova funÃ§Ã£o para executar a busca
    const executeSearch = useCallback(async () => {
        if (!searchInputValue.trim()) {
            // Se nÃ£o hÃ¡ texto, limpar busca e mostrar todos os imÃ³veis
            clearSearch();
            return;
        }

        console.log(`ðŸ”ðŸ”ðŸ” HomeScreen: EXECUTANDO BUSCA: "${searchInputValue}" ðŸ”ðŸ”ðŸ”`);
        setIsSearching(true);
        setSearchTerm(searchInputValue);
        setCurrentPage(0);

        // Atualizar apenas os dados, sem re-renderizar a pÃ¡gina inteira
        await fetchProperties(filters, searchInputValue, 0, true, true); // true = mudanÃ§a de busca/filtro

        // Fechar o teclado
        if (searchInputRef.current) {
            searchInputRef.current.blur();
        }
    }, [searchInputValue, filters]);

    // FunÃ§Ã£o para lidar com mudanÃ§as no input (sem executar busca automÃ¡tica)
    const handleSearchInputChange = (text) => {
        setSearchInputValue(text);
    };

    const clearSearch = () => {
        console.log('ðŸ§¹ðŸ§¹ðŸ§¹ HomeScreen: LIMPANDO BUSCA ðŸ§¹ðŸ§¹ðŸ§¹');
        setSearchInputValue('');
        setSearchTerm('');
        setCurrentPage(0);
        // Mostrar imediatamente do cache e revalidar em background
        fetchProperties(filters, '', 0, false, true);
    };

    const clearFilters = () => {
        console.log('ðŸ§¹ðŸ§¹ðŸ§¹ HomeScreen: LIMPANDO FILTROS E BUSCA ðŸ§¹ðŸ§¹ðŸ§¹');
        const clearedFilters = {
            city: '',
            propertyType: [],
            minPrice: '',
            maxPrice: '',
        };
        setFilters(clearedFilters);
        setTempFilters(clearedFilters);
        setSearchInputValue(''); // Limpar o input de busca
        setSearchTerm(''); // Limpar o termo de busca ativo
        setCurrentPage(0);
        // Mostrar imediatamente do cache e revalidar em background
        fetchProperties(clearedFilters, '', 0, false, true);
    };

    const openFiltersModal = () => {
        setTempFilters(filters); // Copiar filtros atuais para temporários
        setShowFiltersModal(true);
    };

    const closeFiltersModal = () => {
        setShowFiltersModal(false);
    };

    const applyFilters = (newFilters = tempFilters) => {
        console.log('ðŸ”ðŸ”ðŸ” HomeScreen: APLICANDO FILTROS ðŸ”ðŸ”ðŸ”');
        setFilters(newFilters);
        setSearchInputValue(''); // Limpar busca ao aplicar filtros
        setSearchTerm('');
        setCurrentPage(0);
        setShowFiltersModal(false);
        // Aplicar filtros e buscar propriedades
        fetchProperties(newFilters, '', 0, true, true);
    };









    const fetchCities = async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('city')
                .not('city', 'is', null)
                .neq('city', '');

            if (error) {
                console.error('âŒ Erro ao buscar cidades:', error);
            } else {
                // Remover duplicatas, normalizar e ordenar
                const citySet = new Set();
                data.forEach(item => {
                    if (item.city && item.city.trim()) {
                        // Normalizar: remover espaÃ§os extras e converter para lowercase para comparaÃ§Ã£o
                        const normalizedCity = item.city.trim();
                        citySet.add(normalizedCity);
                    }
                });

                const uniqueCities = Array.from(citySet).sort((a, b) =>
                    a.toLowerCase().localeCompare(b.toLowerCase())
                );

                console.log('ðŸ™ï¸ Cidades carregadas:', uniqueCities.length, uniqueCities.slice(0, 5));
                setCities(uniqueCities);
            }
        } catch (error) {
            console.error('âŒ Erro ao buscar cidades:', error);
        }
    };

    const handleToggleFavorite = useCallback(async (propertyId) => {
        await toggleFavorite(propertyId);
    }, [toggleFavorite]);

    const loadMoreProperties = async () => {
        if (loadingMore || !hasMore) {
            console.log('â¸ï¸â¸ï¸â¸ï¸ HomeScreen: LOADMORE IGNORADO â¸ï¸â¸ï¸â¸ï¸ - loadingMore:', loadingMore, 'hasMore:', hasMore);
            return;
        }

        console.log(`ðŸ“„ðŸ“„ðŸ“„ HomeScreen: CARREGANDO MAIS PROPRIEDADES - PÃGINA ${currentPage + 1} ðŸ“„ðŸ“„ðŸ“„`);
        setLoadingMore(true);
        const nextPage = currentPage + 1;
        await fetchProperties(filters, searchTerm, nextPage);
    };

    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.loadingMoreContainer}>
                <Text style={styles.loadingMoreText}>Carregando mais anÃºncios...</Text>
            </View>
        );
    };




    // Componente simplificado para renderizar propriedades
    const PropertyItem = React.memo(({ item, index, isFavorited, handleToggleFavorite, navigation }) => {
        const mediaFiles = item.images || [];
        const [currentIndex, setCurrentIndex] = useState(0);
        // ✅ Usar Zustand para verificar boost (O(1))
        const isPropertyBoosted = isBoosted(item.id);

        // Memoizar o onPress para evitar re-renderizaÃ§Ãµes
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: item });
        }, [navigation, item]);

        const handleFavoritePress = useCallback((event) => {
            event.stopPropagation(); // NÃ£o propagar para o card
            handleToggleFavorite(item.id);
        }, [handleToggleFavorite, item.id]);

        // Separar imagens e vÃ­deos (simplificado)
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

        // Fallback para quando nÃ£o hÃ¡ imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayMediaFiles = imageFiles.length > 0 ? imageFiles : [defaultImage];

        // NavegaÃ§Ã£o com setas
        const handlePreviousImage = useCallback((event) => {
            event.stopPropagation();
            setCurrentIndex(prev => prev > 0 ? prev - 1 : displayMediaFiles.length - 1);
        }, [displayMediaFiles.length]);

        const handleNextImage = useCallback((event) => {
            event.stopPropagation();
            setCurrentIndex(prev => prev < displayMediaFiles.length - 1 ? prev + 1 : 0);
        }, [displayMediaFiles.length]);

        return (
            <TouchableOpacity
                style={styles.propertyCard}
                onPress={handlePress}
                activeOpacity={0.8}
            >

                <View style={styles.mediaSection}>
                    {/* Imagem atual */}
                    <Image
                        source={{ uri: displayMediaFiles[currentIndex] }}
                        style={styles.mediaItem}
                        contentFit="cover"
                        cachePolicy="disk"
                        placeholder={require('../assets/placeholder-image.png')}
                        transition={0}
                        priority="normal"
                    />

                    {/* NavegaÃ§Ã£o integrada com contador (apenas se hÃ¡ mÃºltiplas imagens) */}
                    {hasMultipleMedia && (
                        <View style={styles.imageNavigationCompact}>
                            <TouchableOpacity
                                style={styles.navButtonCompact}
                                onPress={handlePreviousImage}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={24} color="#fff" />
                            </TouchableOpacity>

                            <Text style={styles.imageCounterCompact}>
                                {currentIndex + 1}/{displayMediaFiles.length}
                            </Text>

                            <TouchableOpacity
                                style={styles.navButtonCompact}
                                onPress={handleNextImage}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-forward" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Ãcones de tipo de mÃ­dia */}
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

                    {/* BotÃ£o de Favoritos (componente isolado e memoizado) */}
                    <View style={styles.favoriteButton}>
                        <FavoriteButton isFavorited={isFavorited} onPress={() => toggleFavorite(item.id)} disabled={false} propertyId={item.id} />
                    </View>

                </View>

                <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                        {item.title ?? 'Título indisponível'}
                    </Text>

                    <Text style={styles.propertyLocation}>
                        {item.neighborhood ?? item.address}, {item.city ?? item.state}
                    </Text>
                    <View style={styles.propertyDetails}>
                        {((item.sale_price ?? item.salePrice) && parseFloat(item.sale_price ?? item.salePrice) > 0) ? (
                            <View style={styles.priceContainer}>
                                <Text style={styles.originalPriceRed}>
                                    De: R$ {item.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                                </Text>
                                <Text style={styles.salePriceGreen}>
                                    Por: R$ {(item.sale_price ?? item.salePrice)?.toLocaleString('pt-BR')}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.propertyPrice}>
                                R$ {item.price?.toLocaleString('pt-BR') ?? 'Preço indisponível'}
                            </Text>
                        )}
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
                        {(item.property_type ?? '') + ' a ' + (item.transaction_type ?? '')}
                    </Text>

                    {/* Badge de Destaque - Canto inferior direito */}
                    {isPropertyBoosted && (
                        <View style={styles.boostBadge}>
                            <Ionicons name="rocket" size={12} color="#fff" />
                            <Text style={styles.boostBadgeText}>Destaque</Text>
                        </View>
                    )}
                    {/* Botão "Ver detalhes" para indicar que o card é clicável */}
                    {/* <TouchableOpacity
                        style={styles.verDetalhesButton}
                        activeOpacity={0.8}
                        onPress={handlePress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.verDetalhesText}>Ver detalhes</Text>
                    </TouchableOpacity> */}
                </View>

            </TouchableOpacity>
        );
    }, (prevProps, nextProps) => {
        return (
            prevProps.item.id === nextProps.item.id &&
            prevProps.isFavorited === nextProps.isFavorited
        );
    });

    const renderProperty = useCallback(({ item, index }) => {
        const isFavorited = isFavorite(item.id);
        return (
            <PropertyItem
                item={item}
                index={index}
                isFavorited={isFavorited}
                handleToggleFavorite={handleToggleFavorite}
                navigation={navigation}
            />
        );
    }, [isFavorite, handleToggleFavorite, navigation]);

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar
                    backgroundColor="#ffcc1e"
                    style="dark"
                    translucent={false}
                />
                <View style={[styles.safeAreaTop, { height: insets.top }]} />
                <View style={styles.contentContainer}>
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Carregando...</Text>
                    </View>
                </View>
            </View>
        );
    }



    return (
        <View style={styles.container}>
            <StatusBar
                backgroundColor="#ffcc1e"
                style="dark"
                translucent={false}
            />
            <View style={[styles.safeAreaTop, { height: insets.top }]} />
            <View style={styles.contentContainer}>
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
                        {/* Barra de Pesquisa com BotÃ£o de Busca */}
                        <View style={styles.searchContainer}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                                <TextInput
                                    ref={searchInputRef}
                                    style={styles.searchInput}
                                    placeholder="Buscar imóveis..."
                                    placeholderTextColor="#7f8c8d"
                                    value={searchInputValue}
                                    onChangeText={handleSearchInputChange}
                                    returnKeyType="search"
                                    onSubmitEditing={executeSearch}
                                />
                                {searchInputValue.length > 0 && (
                                    <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                                        <Ionicons name="close-circle" size={20} color="#7f8c8d" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* BotÃ£o de Busca Discreto */}
                            <TouchableOpacity
                                style={[
                                    styles.searchButton,
                                    searchInputValue.trim() && styles.searchButtonActive
                                ]}
                                onPress={executeSearch}
                                activeOpacity={0.8}
                                disabled={!searchInputValue.trim()}
                            >
                                <Ionicons
                                    name="search"
                                    size={18}
                                    color={searchInputValue.trim() ? "#fff" : "#7f8c8d"}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Segunda linha: Filtros + Ordenar + Ver Mapa + Limpar */}
                    <View style={styles.headerBottom}>
                        <View style={styles.leftButtons}>
                            <TouchableOpacity onPress={openFiltersModal} style={styles.filtersButton}>
                                <Ionicons name="options-outline" size={16} color="#00335e" />
                                <Text style={styles.filtersText}>Filtros</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filtersButton}>
                                <Ionicons name="swap-vertical" size={16} color="#00335e" />
                                <Text style={styles.filtersText}>Ordenar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.filtersButton}
                                onPress={() => navigation.navigate('MapaImoveis', { filters: filters })}
                            >
                                <Ionicons name="map" size={16} color="#00335e" />
                                <Text style={styles.filtersText}>Ver Mapa</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.rightButtons}>
                            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                                <Text style={styles.clearFiltersText}>Limpar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <FlatList
                    data={properties}
                    renderItem={renderProperty}
                    keyExtractor={(item) => `property-${item.id}`}
                    // extraData removido para evitar re-render global
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListHeaderComponent={
                        <View style={styles.propertiesSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>
                                    {`Anúncios (${totalCount})`}
                                    {searchTerm && (
                                        <Text style={styles.searchResultInfo}>
                                            {` - Busca: "${searchTerm}"`}
                                        </Text>
                                    )}
                                </Text>
                                {isSearching && (
                                    <Text style={styles.searchingText}>Buscando...</Text>
                                )}
                            </View>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="home-outline" size={64} color="#bdc3c7" />
                            <Text style={styles.emptyText}>
                                {searchTerm ? 'Nenhum imóvel encontrado para esta busca' : 'Nenhum anúncio encontrado'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchTerm ? 'Tente ajustar os termos de busca' : 'Tente ajustar os filtros ou volte mais tarde'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                    // Otimizações de performance para scroll aninhado
                    removeClippedSubviews={false}
                    maxToRenderPerBatch={2}
                    windowSize={5}
                    initialNumToRender={2}
                    updateCellsBatchingPeriod={150}
                    scrollEventThrottle={32}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    decelerationRate="normal"
                    scrollEnabled={true}
                    nestedScrollEnabled={false}
                    directionalLockEnabled={true}
                    alwaysBounceVertical={false}
                    onEndReached={loadMoreProperties}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        <>
                            {renderFooter()}
                            {listLoading && (
                                <View style={styles.loadingMoreContainer}>
                                    <Text style={styles.loadingMoreText}>Atualizando lista...</Text>
                                </View>
                            )}
                        </>
                    }
                />

                {/* Modal de Filtros */}
                <FiltersModal
                    visible={showFiltersModal}
                    onClose={closeFiltersModal}
                    filters={tempFilters}
                    onApplyFilters={applyFilters}
                    cities={cities}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safeAreaTop: {
        backgroundColor: '#ffcc1e',
        width: '100%',
    },
    contentContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    storiesContainer: {
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#ffcc1e',
        height: 120, // Altura reduzida jÃ¡ que removemos os botÃµes de admin
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 5,
        paddingHorizontal: 0,
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
        marginBottom: 0,
        paddingHorizontal: 10,
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
        backgroundColor: '#f8f9fa',
    },
    mediaList: {
        height: 200,
        flex: 1,
    },
    mediaItem: {
        width: width - 40, // 40 Ã© o padding horizontal
        height: 200,
        backgroundColor: '#e9ecef',
    },

    imageNavigationCompact: {
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(62, 60, 60, 0)',
        borderRadius: 25,
        paddingHorizontal: 8,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    navButtonCompact: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(18, 17, 17, 0.38)',
    },
    imageCounterCompact: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginHorizontal: 16,
        textAlign: 'center',
        minWidth: 40,
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
        backgroundColor: 'rgba(255, 255, 255, 0)',
        borderRadius: 15,
        padding: 8,
        zIndex: 10,
    },
    favoriteIcon: {
        width: 24,
        height: 24,
    },
    boostBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#f39c12',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 9,
    },
    boostBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
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
    priceContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    originalPrice: {
        fontSize: 14,
        color: '#9ca3af',
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    salePrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#dc2626',
    },
    originalPriceRed: {
        fontSize: 14,
        color: '#dc2626',
        textDecorationLine: 'line-through',
        marginBottom: 2,
    },
    salePriceGreen: {
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



    searchBar: {
        flex: 1,
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

    searchResultInfo: {
        fontSize: 14,
        color: '#7f8c8d',
        fontStyle: 'italic',
    },
    searchingText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginTop: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        height: 48,
    },
    searchButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        width: 40,
        height: 40,
    },
    searchButtonActive: {
        backgroundColor: '#00335e',
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
        flex: 1,
        gap: 12,
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16,
    },
    clearFiltersButton: {
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '400',
        color: '#7f8c8d',
        textDecorationLine: 'underline',
    },
    filtersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        gap: 4,
    },
    filtersText: {
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
        overflow: 'hidden', // Evita que o conteÃºdo extrapole
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
