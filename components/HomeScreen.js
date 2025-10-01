import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { supabase } from '../lib/supabase';
import PropertyCacheService from '../lib/propertyCacheService';
import StoriesComponent from './StoriesComponent';

const { width } = Dimensions.get('window');

// Função debounce para otimizar performance
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
    // console.log('🏠 HomeScreen: COMPONENTE MONTADO/RENDERIZADO'); // Removido para evitar logs excessivos

    const { user, signOut } = useAuth();
    const { favorites, toggleFavorite, isFavorite } = useFavorites();
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
    const [isSearching, setIsSearching] = useState(false); // Estado para indicar se está buscando
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
    const [priceRange, setPriceRange] = useState({
        min: 0,
        max: 5000000,
    });
    const [sliderValues, setSliderValues] = useState({
        min: 0,
        max: 5000000,
    });
    const [minSliderValue, setMinSliderValue] = useState(0);
    const [maxSliderValue, setMaxSliderValue] = useState(5000000);

    // Estados para dropdown de cidades
    const [cities, setCities] = useState([]);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState('');

    // Estados para lazy loading
    const [currentPage, setCurrentPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Estado para controlar dados
    const [hasInitialData, setHasInitialData] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0); // Manter posição do scroll

    // Refs para controle
    const searchInputRef = useRef(null);
    const flatListRef = useRef(null);

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
        if (!hasInitialData) {
            console.log('👤👤👤 HomeScreen: CARREGANDO DADOS INICIAIS 👤👤👤');
            // Carregar dados apenas uma vez
            if (user?.id) {
                fetchProfile();
            }
            fetchProperties();
            fetchCities(); // Buscar cidades disponíveis
            setHasInitialData(true);
        }
    }, [user?.id, hasInitialData]);

    // Garantir que os dados sejam carregados quando a tela ganhar foco
    useFocusEffect(
        useCallback(() => {
            console.log('🏠 HomeScreen: TELA GANHOU FOCO');
            if (!hasInitialData) {
                console.log('👤👤👤 HomeScreen: CARREGANDO DADOS NO FOCUS 👤👤👤');
                if (user?.id) {
                    fetchProfile();
                }
                fetchProperties();
                setHasInitialData(true);
            }
        }, [user?.id, hasInitialData])
    );

    // Detectar quando o componente é desmontado
    useEffect(() => {
        console.log('🏠 HomeScreen: COMPONENTE MONTADO - useEffect cleanup');
        return () => {
            console.log('🏠 HomeScreen: COMPONENTE DESMONTADO');
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
                console.error('❌ Erro ao buscar perfil:', error);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error);
        }
    };

    const fetchProperties = async (customFilters = null, searchQuery = null, page = 0, forceRefresh = false, isSearchOrFilterChange = false) => {
        // Evitar recarregamento se já temos dados e não é forceRefresh
        // Mas sempre executar se for forceRefresh ou mudança de busca/filtro
        if (page === 0 && properties.length > 0 && !forceRefresh && !isSearchOrFilterChange && hasInitialData) {
            console.log('🏠 HomeScreen: Dados já carregados, pulando fetchProperties');
            return;
        }

        // Se não temos dados iniciais e não é uma mudança de filtro/busca, forçar carregamento
        if (page === 0 && !hasInitialData && !isSearchOrFilterChange) {
            console.log('🏠 HomeScreen: Primeiro carregamento, forçando busca');
            forceRefresh = true;
        }

        console.log('🏠 HomeScreen: Carregando propriedades...');
        console.log('🏠 HomeScreen: Parâmetros:', { customFilters, searchQuery, page, forceRefresh, isSearchOrFilterChange });

        // Controlar loading baseado no tipo de operação
        if (page === 0) {
            if (isSearchOrFilterChange) {
                setListLoading(true); // Loading apenas da lista (não pisca a tela)
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
                enableParallelUpdate: true // Habilitar atualização em background (SWR)
            });

            console.log('🏠 HomeScreen: Resultado recebido:', {
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

        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);
            Alert.alert('Erro', 'Não foi possível carregar os anúncios');
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
        console.log('🔄🔄🔄 HomeScreen: INICIANDO REFRESH MANUAL 🔄🔄🔄');
        setRefreshing(true);
        setCurrentPage(0);
        await Promise.all([
            fetchProperties(filters, searchTerm, 0, true), // Forçar refresh
            fetchProfile()
        ]);
        setRefreshing(false);
        console.log('✅✅✅ HomeScreen: REFRESH MANUAL FINALIZADO ✅✅✅');
    };

    // Nova função para executar a busca
    const executeSearch = useCallback(async () => {
        if (!searchInputValue.trim()) {
            // Se não há texto, limpar busca e mostrar todos os imóveis
            clearSearch();
            return;
        }

        console.log(`🔍🔍🔍 HomeScreen: EXECUTANDO BUSCA: "${searchInputValue}" 🔍🔍🔍`);
        setIsSearching(true);
        setSearchTerm(searchInputValue);
        setCurrentPage(0);

        // Atualizar apenas os dados, sem re-renderizar a página inteira
        await fetchProperties(filters, searchInputValue, 0, true, true); // true = mudança de busca/filtro

        // Fechar o teclado
        if (searchInputRef.current) {
            searchInputRef.current.blur();
        }
    }, [searchInputValue, filters]);

    // Função para lidar com mudanças no input (sem executar busca automática)
    const handleSearchInputChange = (text) => {
        setSearchInputValue(text);
    };

    const clearSearch = () => {
        console.log('🧹🧹🧹 HomeScreen: LIMPANDO BUSCA 🧹🧹🧹');
        setSearchInputValue('');
        setSearchTerm('');
        setCurrentPage(0);
        // Mostrar imediatamente do cache e revalidar em background
        fetchProperties(filters, '', 0, false, true);
    };

    const clearFilters = () => {
        console.log('🧹🧹🧹 HomeScreen: LIMPANDO FILTROS E BUSCA 🧹🧹🧹');
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
        setCitySearchTerm(filters.city); // Inicializar campo de cidade

        // Configurar valores do slider baseado nos filtros atuais
        let minPrice = filters.minPrice ? parseFloat(filters.minPrice) : 0;
        let maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) : 5000000;

        // Garantir distância mínima entre as bolinhas
        if (maxPrice - minPrice < 100000) {
            if (minPrice === 0) {
                maxPrice = 100000;
            } else {
                minPrice = Math.max(0, maxPrice - 100000);
            }
        }

        setSliderValues({ min: minPrice, max: maxPrice });
        setMinSliderValue(minPrice);
        setMaxSliderValue(maxPrice);

        setShowFiltersModal(true);
    };

    const closeFiltersModal = () => {
        setShowFiltersModal(false);
    };

    const applyFilters = () => {
        console.log('🔍🔍🔍 HomeScreen: APLICANDO FILTROS 🔍🔍🔍');
        setFilters(tempFilters);
        setSearchInputValue(''); // Limpar busca ao aplicar filtros
        setSearchTerm('');
        setCurrentPage(0);
        setShowFiltersModal(false);
        // Aplicar filtros e buscar propriedades
        fetchProperties(tempFilters, '', 0, true, true);
    };

    const handleMinSliderChange = useCallback((value) => {
        // Garantir que o preço mínimo não seja maior que o máximo
        const maxValue = Math.max(value + 100000, maxSliderValue);
        setMinSliderValue(value);
        setMaxSliderValue(maxValue);
        setSliderValues(prev => ({ min: value, max: maxValue }));

        // Atualizar filtros temporários
        setTempFilters(prev => ({
            ...prev,
            minPrice: value > 0 ? value.toString() : '',
            maxPrice: maxValue < 5000000 ? maxValue.toString() : '',
        }));
    }, [maxSliderValue]);

    const handleMaxSliderChange = useCallback((value) => {
        // Garantir que o preço máximo não seja menor que o mínimo
        const minValue = Math.min(value - 100000, minSliderValue);
        setMaxSliderValue(value);
        setMinSliderValue(minValue);
        setSliderValues(prev => ({ min: minValue, max: value }));

        // Atualizar filtros temporários
        setTempFilters(prev => ({
            ...prev,
            minPrice: minValue > 0 ? minValue.toString() : '',
            maxPrice: value < 5000000 ? value.toString() : '',
        }));
    }, [minSliderValue]);

    const formatPrice = useCallback((value) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        }
        return value.toString();
    }, []);


    const selectCity = (city) => {
        setCitySearchTerm(city);
        setTempFilters(prev => ({ ...prev, city }));
        setShowCityDropdown(false);
    };






    const fetchCities = async () => {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('city')
                .not('city', 'is', null)
                .neq('city', '');

            if (error) {
                console.error('❌ Erro ao buscar cidades:', error);
            } else {
                // Remover duplicatas, normalizar e ordenar
                const citySet = new Set();
                data.forEach(item => {
                    if (item.city && item.city.trim()) {
                        // Normalizar: remover espaços extras e converter para lowercase para comparação
                        const normalizedCity = item.city.trim();
                        citySet.add(normalizedCity);
                    }
                });

                const uniqueCities = Array.from(citySet).sort((a, b) =>
                    a.toLowerCase().localeCompare(b.toLowerCase())
                );

                console.log('🏙️ Cidades carregadas:', uniqueCities.length, uniqueCities.slice(0, 5));
                setCities(uniqueCities);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar cidades:', error);
        }
    };

    const handleToggleFavorite = useCallback(async (propertyId) => {
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
                    return;
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
                    return;
                }
            }

            // Usar a função do contexto (que dispara a animação)
            toggleFavorite(propertyId);
        } catch (error) {
            console.error('❌ Erro ao gerenciar favorito:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        }
    }, [user?.id, favorites, toggleFavorite]);

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
    const PropertyItem = React.memo(({ item, index, favorites, handleToggleFavorite, navigation }) => {
        const mediaFiles = item.images || [];
        const [currentIndex, setCurrentIndex] = useState(0);

        // Memoizar o onPress para evitar re-renderizações
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: item });
        }, [navigation, item]);

        const handleFavoritePress = useCallback((event) => {
            event.stopPropagation(); // Não propagar para o card
            handleToggleFavorite(item.id);
        }, [handleToggleFavorite, item.id]);

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

        // Navegação com setas
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

                    {/* Navegação integrada com contador (apenas se há múltiplas imagens) */}
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
                            name={favorites[item.id] ? 'heart' : 'heart-outline'}
                            size={30}
                            color={favorites[item.id] ? '#e74c3c' : '#ffffff'}
                        />
                    </TouchableOpacity>
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
                        {(item.property_type ?? '') + ' • ' + (item.transaction_type ?? '')}
                    </Text>

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
                handleToggleFavorite={handleToggleFavorite}
                navigation={navigation}
            />
        );
    }, [favorites, handleToggleFavorite, navigation]);



    const renderFilterModal = () => null; // Modal desabilitado para melhorar performance

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
                        {/* Barra de Pesquisa com Botão de Busca */}
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

                            {/* Botão de Busca Discreto */}
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
                <Modal
                    visible={showFiltersModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={closeFiltersModal}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={closeFiltersModal}
                    >
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalContent}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filtros</Text>
                                <TouchableOpacity onPress={closeFiltersModal}>
                                    <Ionicons name="close" size={24} color="#00335e" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                <TouchableOpacity
                                    style={styles.filtersContainer}
                                    activeOpacity={1}
                                    onPress={() => setShowCityDropdown(false)}
                                >
                                    <ScrollView
                                        style={styles.filtersScrollView}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {/* Tipo de Propriedade */}
                                        <View style={styles.filterGroup}>
                                            <Text style={styles.filterLabel}>Tipo de Propriedade</Text>
                                            <View style={styles.propertyTypeContainer}>
                                                {['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Rural'].map((type) => (
                                                    <TouchableOpacity
                                                        key={type}
                                                        style={[
                                                            styles.propertyTypeButton,
                                                            tempFilters.propertyType.includes(type) && styles.propertyTypeButtonSelected
                                                        ]}
                                                        onPress={() => setTempFilters(prev => ({
                                                            ...prev,
                                                            propertyType: prev.propertyType.includes(type)
                                                                ? prev.propertyType.filter(t => t !== type)
                                                                : [...prev.propertyType, type]
                                                        }))}
                                                    >
                                                        <Text style={[
                                                            styles.propertyTypeButtonText,
                                                            tempFilters.propertyType.includes(type) && styles.propertyTypeButtonTextSelected
                                                        ]}>
                                                            {type}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Cidade com Dropdown */}
                                        <View style={styles.filterGroup}>
                                            <Text style={styles.filterLabel}>Cidade</Text>
                                            <TouchableOpacity
                                                style={styles.cityDropdownContainer}
                                                activeOpacity={0.7}
                                                onPress={() => setShowCityDropdown(!showCityDropdown)}
                                            >
                                                <View style={styles.cityDropdownButton}>
                                                    <Text style={[
                                                        styles.cityDropdownButtonText,
                                                        !citySearchTerm && styles.cityDropdownPlaceholder
                                                    ]}>
                                                        {citySearchTerm || 'Selecione uma cidade'}
                                                    </Text>
                                                    <Ionicons
                                                        name={showCityDropdown ? "chevron-up" : "chevron-down"}
                                                        size={20}
                                                        color="#7f8c8d"
                                                    />
                                                </View>
                                                {showCityDropdown && (
                                                    <View style={styles.cityDropdown}>
                                                        <ScrollView
                                                            style={styles.cityDropdownList}
                                                            keyboardShouldPersistTaps="handled"
                                                            nestedScrollEnabled={true}
                                                            showsVerticalScrollIndicator={true}
                                                            bounces={false}
                                                            scrollEventThrottle={16}
                                                        >
                                                            <TouchableOpacity
                                                                style={styles.cityDropdownItem}
                                                                onPress={() => selectCity('')}
                                                            >
                                                                <Text style={styles.cityDropdownText}>Todas as cidades</Text>
                                                            </TouchableOpacity>
                                                            {cities.map((city, index) => (
                                                                <TouchableOpacity
                                                                    key={index}
                                                                    style={[
                                                                        styles.cityDropdownItem,
                                                                        citySearchTerm === city && styles.cityDropdownItemSelected
                                                                    ]}
                                                                    onPress={() => selectCity(city)}
                                                                >
                                                                    <Text style={[
                                                                        styles.cityDropdownText,
                                                                        citySearchTerm === city && styles.cityDropdownTextSelected
                                                                    ]}>
                                                                        {city}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>

                                        {/* Range de Preço com Slider */}
                                        <View style={styles.filterGroup}>
                                            <Text style={styles.filterLabel}>Faixa de Preço</Text>

                                            {/* Valores de preço acima dos sliders */}
                                            <View style={styles.priceDisplayContainer}>
                                                <Text style={styles.priceDisplayText}>
                                                    R$ {formatPrice(sliderValues.min)}
                                                </Text>
                                                <Text style={styles.priceDisplayText}>
                                                    R$ {formatPrice(sliderValues.max)}
                                                </Text>
                                            </View>

                                            {/* Sliders ocupando toda a largura */}
                                            <View style={styles.sliderContainer}>
                                                <Text style={styles.sliderLabel}>Preço Mínimo</Text>
                                                <Slider
                                                    style={styles.slider}
                                                    minimumValue={priceRange.min}
                                                    maximumValue={priceRange.max}
                                                    value={minSliderValue}
                                                    onValueChange={handleMinSliderChange}
                                                    minimumTrackTintColor="#00335e"
                                                    maximumTrackTintColor="#e2e8f0"
                                                    thumbStyle={styles.sliderThumb}
                                                    step={10000}
                                                />

                                                <Text style={styles.sliderLabel}>Preço Máximo</Text>
                                                <Slider
                                                    style={styles.slider}
                                                    minimumValue={priceRange.min}
                                                    maximumValue={priceRange.max}
                                                    value={maxSliderValue}
                                                    onValueChange={handleMaxSliderChange}
                                                    minimumTrackTintColor="#00335e"
                                                    maximumTrackTintColor="#e2e8f0"
                                                    thumbStyle={styles.sliderThumb}
                                                    step={10000}
                                                />
                                            </View>
                                        </View>
                                    </ScrollView>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.filterButtons}>
                                <TouchableOpacity style={styles.clearButton} onPress={() => {
                                    setTempFilters({
                                        city: '',
                                        propertyType: [],
                                        minPrice: '',
                                        maxPrice: '',
                                    });
                                    setCitySearchTerm('');
                                    setSliderValues({ min: 0, max: 5000000 });
                                    setMinSliderValue(0);
                                    setMaxSliderValue(5000000);
                                    setShowCityDropdown(false);
                                }}>
                                    <Text style={styles.clearButtonText}>Limpar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                                    <Text style={styles.applyButtonText}>Aplicar</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableOpacity>
                </Modal>

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
        height: 120, // Altura reduzida já que removemos os botões de admin
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
        width: width - 40, // 40 é o padding horizontal
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
        padding: 8,
        zIndex: 10,
    },
    favoriteIcon: {
        width: 24,
        height: 24,
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
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalBody: {
        flex: 1,
        minHeight: 0, // Importante para o flex funcionar corretamente
    },
    filtersScrollView: {
        flex: 1,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
    },
    filtersContainer: {
        flex: 1,
        padding: 20,
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
        width: '100%',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40, // Safe area para evitar que fique atrás da barra de navegação
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

    // Estilos para o modal de filtros
    propertyTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    propertyTypeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    propertyTypeButtonSelected: {
        backgroundColor: '#00335e',
        borderColor: '#00335e',
    },
    propertyTypeButtonText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    propertyTypeButtonTextSelected: {
        color: '#ffffff',
    },
    priceRangeContainer: {
        flexDirection: 'column',
        width: '100%',
    },
    priceInputContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4,
    },
    priceInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#1e3a8a',
        backgroundColor: '#fff',
    },

    // Estilos para o slider de preço
    priceDisplayContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    priceDisplayText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
    },
    sliderContainer: {
        marginBottom: 20,
        width: '100%',
        paddingHorizontal: 0,
    },
    sliderLabel: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 5,
        marginTop: 8,
    },
    slider: {
        width: '100%',
        height: 40,
        marginBottom: 5,
    },
    sliderThumb: {
        width: 24,
        height: 24,
        backgroundColor: '#00335e',
    },

    // Estilos para dropdown de cidades
    cityDropdownContainer: {
        position: 'relative',
        zIndex: 1000,
    },
    cityDropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    cityDropdownButtonText: {
        fontSize: 16,
        color: '#1e3a8a',
        flex: 1,
    },
    cityDropdownPlaceholder: {
        color: '#7f8c8d',
    },
    cityDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        maxHeight: 200,
        zIndex: 1001,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cityDropdownList: {
        maxHeight: 200,
        flexGrow: 0,
    },
    cityDropdownItem: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    cityDropdownText: {
        fontSize: 16,
        color: '#00335e',
    },
    cityDropdownItemSelected: {
        backgroundColor: '#f0f9ff',
    },
    cityDropdownTextSelected: {
        color: '#00335e',
        fontWeight: '600',
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