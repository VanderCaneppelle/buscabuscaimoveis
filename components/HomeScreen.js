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
    Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import FavoriteButton from './FavoriteButton';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { useFavoritesStore } from '../stores/favoritesStore';
import { useBoostsStore } from '../stores/boostsStore';
import { usePropertiesStore } from '../stores/propertiesStore'; // ✨ NOVO
import { supabase } from '../lib/supabase';
import PropertyCacheService from '../lib/propertyCacheService';
import StoriesComponent from './StoriesComponent';
import { CardStyleInterpolators } from '@react-navigation/stack';
import { FiltersModal, DevelopersFilterModal, RealtorsFilterModal } from './modals';
import NotificationBell from './NotificationBell';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 420; // Detectar telas menores (S22 e similares)

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
    // console.log('  HomeScreen: COMPONENTE MONTADO/RENDERIZADO'); // Removido para evitar logs excessivos

    const { user, signOut } = useAuth();
    const { isAdmin } = useAdmin();

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

    // ✨ NOVO: Zustand Properties Store (Realtime)
    const connectRealtimeProperties = usePropertiesStore(state => state.connectRealtime);
    const disconnectRealtimeProperties = usePropertiesStore(state => state.disconnectRealtime);

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
        userType: 'all',
        developerId: null,
        realtorId: null,
    });
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [tempFilters, setTempFilters] = useState({
        city: '',
        propertyType: [],
        minPrice: '',
        maxPrice: '',
        userType: 'all',
        developerId: null,
        realtorId: null,
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
    
    // ✨ NOVOS: Estados para filtros rápidos (userType)
    const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'developer' | 'realtor' | 'owner'
    const [selectedDeveloper, setSelectedDeveloper] = useState(null);
    const [selectedRealtor, setSelectedRealtor] = useState(null);
    const [showDevelopersModal, setShowDevelopersModal] = useState(false);
    const [showRealtorsModal, setShowRealtorsModal] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null); // Propriedade selecionada no mapa
    const [multiplePropertiesModal, setMultiplePropertiesModal] = useState(false); // Modal de múltiplos imóveis
    const [propertiesAtLocation, setPropertiesAtLocation] = useState([]); // Imóveis na mesma localização

    // Cores dinÃ¢micas baseadas no tema do dispositivo
    const colors = {
        headerBg: '#ffffff', // Header sempre branco
        headerBorder: '#e2e8f0',
        textPrimary: '#00335e',
        textSecondary: '#64748b',
        buttonBg: '#00335e',
        buttonText: '#ffffff',
    };

    // 🗺️ Função para agrupar propriedades por coordenadas idênticas
    const groupedMarkers = useMemo(() => {
        const groups = new Map();
        
        properties.forEach(property => {
            const lat = parseFloat(property.latitude);
            const lng = parseFloat(property.longitude);
            
            if (isNaN(lat) || isNaN(lng)) return;
            
            // Criar chave única para coordenadas (arredonda para 6 casas decimais)
            const coordKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            
            if (!groups.has(coordKey)) {
                groups.set(coordKey, {
                    latitude: lat,
                    longitude: lng,
                    properties: []
                });
            }
            
            groups.get(coordKey).properties.push(property);
        });
        
        return Array.from(groups.values());
    }, [properties]);

    // 🔍 Handler para clique em marker (único ou múltiplo)
    const handleMarkerPress = useCallback((group) => {
        if (group.properties.length === 1) {
            // Apenas 1 imóvel: mostra card direto
            setSelectedProperty(group.properties[0]);
        } else {
            // Múltiplos imóveis: abre modal de lista
            setPropertiesAtLocation(group.properties);
            setMultiplePropertiesModal(true);
        }
    }, []);

    // 🏠 Handler para selecionar imóvel da lista
    const handleSelectPropertyFromList = useCallback((property) => {
        setMultiplePropertiesModal(false);
        setSelectedProperty(property);
    }, []);

    useEffect(() => {
        console.log('  HomeScreen: useEffect dados - user?.id:', !!user?.id, 'hasInitialData:', hasInitialData);
        if (!hasInitialData) {
            console.log('HomeScreen: CARREGANDO DADOS INICIAIS ');
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
            if (!hasInitialData) {
                if (user?.id) {
                    fetchProfile();
                }
                fetchProperties();
                // ✅ Carregar boosts (com cache de 5 min)
                fetchBoostedIds();
                setHasInitialData(true);
            }
            // ✨ NÃO chamar fetchProperties aqui - causa piscada ao favoritar/desfavoritar
            // Smart revalidation será feita via pull to refresh ou Realtime
            
            // Recarregar favoritos APENAS se foram modificados em outra tela
            if (favoritesChanged) {
                console.log('[HomeScreen] Focus -> favoritesChanged=true. SKIP refreshFavorites (usar estado otimista)');
                clearFavoritesChanged();
            }
        }, [user?.id, hasInitialData, favoritesChanged, fetchBoostedIds])
    );

    // ✨ Auto-renovação: Verifica cache expirado a cada 1 minuto (igual Stories)
    useEffect(() => {
        const checkCacheExpiration = async () => {
            try {
                // Usar a mesma lógica do PropertyCacheService
                const result = await PropertyCacheService.needsRevalidation(filters, searchTerm, 'date_desc', 0);
                
                if (result) {
                    // Se precisa atualizar, refazer busca
                    if (result.needsUpdate) {
                        await fetchProperties(null, null, 0, true, false);
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao verificar cache de propriedades:', error);
            }
        };

        // Verificar a cada 1 minuto (60000ms)
        const interval = setInterval(checkCacheExpiration, 60 * 1000);

        // Cleanup: Limpar interval ao desmontar componente
        return () => clearInterval(interval);
    }, [filters, searchTerm]); // Dependências: se filtros mudarem, recriar interval

    // ✨ NOVO: Conectar/Desconectar Realtime quando HomeScreen monta/desmonta
    useEffect(() => {
        // Callback para atualizar lista local quando Realtime disparar
        const handleRealtimeUpdate = ({ type, data }) => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📡 [HomeScreen] Realtime update recebido!`);
            console.log(`📡 [HomeScreen] Type: ${type}`);
            console.log(`📡 [HomeScreen] ID: ${data.id?.substring(0, 8)}`);
            console.log(`📡 [HomeScreen] Status: ${data.status}, Ad_status: ${data.ad_status}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            if (type === 'INSERT') {
                // Adicionar novo imóvel no topo
                setProperties(prev => {
                    // Verificar se já existe (evitar duplicação)
                    if (prev.some(p => p.id === data.id)) {
                        return prev;
                    }
                    return [data, ...prev];
                });
                setTotalCount(prev => prev + 1);
            } 
            else if (type === 'REMOVE' || type === 'DELETE') {
                // Remover imóvel da lista
                console.log('🗑️ [HomeScreen] Removendo imóvel da lista:', data.id?.substring(0, 8));
                setProperties(prev => {
                    const filtered = prev.filter(p => p.id !== data.id);
                    console.log('📊 [HomeScreen] Lista antes:', prev.length, '→ Lista depois:', filtered.length);
                    return filtered;
                });
                setTotalCount(prev => Math.max(0, prev - 1));
            }
            else if (type === 'UPDATE') {
                // ✨ Tratar UPDATE de forma inteligente
                setProperties(prev => {
                    const existsInList = prev.some(p => p.id === data.id);
                    
                    // Caso 1: Imóvel foi APROVADO e não está na lista → Adicionar
                    if (!existsInList && data.status === 'approved' && data.ad_status === 'active') {
                        console.log('✅ [HomeScreen] Imóvel aprovado via UPDATE, adicionando na lista');
                        setTotalCount(c => c + 1);
                        return [data, ...prev]; // Adicionar no topo
                    }
                    // Caso 2: Imóvel está na lista → Atualizar dados
                    else if (existsInList) {
                        console.log('🔄 [HomeScreen] Atualizando dados do imóvel na lista');
                        return prev.map(p => p.id === data.id ? { ...p, ...data } : p);
                    }
                    // Caso 3: Imóvel não está na lista e não foi aprovado → Ignorar
                    else {
                        console.log('ℹ️ [HomeScreen] UPDATE ignorado (imóvel não aprovado)');
                        return prev;
                    }
                });
            }
        };
        
        // Conectar Realtime com callback
        connectRealtimeProperties(handleRealtimeUpdate);
        
        return () => {
            console.log('  HomeScreen: COMPONENTE DESMONTADO - desconectando Realtime');
            // Desconectar Realtime ao desmontar (economia de recursos)
            disconnectRealtimeProperties();
        };
    }, []); // Sem dependências - conecta 1x ao montar

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
        // Evitar recarregamento se já temos dados e não é forceRefresh
        // Mas sempre executar se for forceRefresh ou mudança de busca/filtro
        if (page === 0 && properties.length > 0 && !forceRefresh && !isSearchOrFilterChange && hasInitialData) {
            console.log('  HomeScreen: Dados já carregados, pulando fetchProperties');
            return; // ✅ REVERTIDO - evita piscada ao favoritar
        }

        // Se não temos dados iniciais e não é uma mudança de filtro/busca, forçar carregamento
        if (page === 0 && !hasInitialData && !isSearchOrFilterChange) {
            console.log('  HomeScreen: Primeiro carregamento, forçando busca');
            forceRefresh = true;
        }

        console.log('  HomeScreen: Carregando propriedades...');
        console.log('  HomeScreen: Parâmetros:', { customFilters, searchQuery, page, forceRefresh, isSearchOrFilterChange });

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
                sortOption: 'date_desc', // Sempre ordenar por mais recentes
                forceRefresh,
                enableParallelUpdate: true // Habilitar atualização em background (SWR)
            });

            console.log('  HomeScreen: Resultado recebido:', {
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
            userType: 'all',
            developerId: null,
            realtorId: null,
        };
        setFilters(clearedFilters);
        setTempFilters(clearedFilters);
        setSearchInputValue(''); // Limpar o input de busca
        setSearchTerm(''); // Limpar o termo de busca ativo
        setCurrentPage(0);
        // ✨ NOVO: Limpar filtros rápidos também
        setQuickFilter('all');
        setSelectedDeveloper(null);
        setSelectedRealtor(null);
        // Mostrar imediatamente do cache e revalidar em background
        fetchProperties(clearedFilters, '', 0, false, true);
    };
    
    // ✨ NOVOS: Funções para lidar com filtros rápidos
    const handleQuickFilter = (type) => {
        console.log(`🔍🔍🔍 HomeScreen: FILTRO RÁPIDO: ${type} 🔍🔍🔍`);
        
        // Resetar filtros avançados (conforme solicitado)
        const clearedFilters = {
            city: '',
            propertyType: [],
            minPrice: '',
            maxPrice: '',
            userType: type,
            developerId: null,
            realtorId: null,
        };
        
        if (type === 'all') {
            // Limpar tudo
            setQuickFilter('all');
            setSelectedDeveloper(null);
            setSelectedRealtor(null);
            setFilters(clearedFilters);
            setTempFilters(clearedFilters);
            setSearchInputValue('');
            setSearchTerm('');
            setCurrentPage(0);
            fetchProperties(clearedFilters, '', 0, true, true);
        } else if (type === 'developer') {
            // Abrir modal de construtoras
            setShowDevelopersModal(true);
        } else if (type === 'realtor') {
            // Abrir modal de corretores
            setShowRealtorsModal(true);
        } else if (type === 'owner') {
            // Aplicar filtro de proprietários direto
            setQuickFilter('owner');
            setSelectedDeveloper(null);
            setSelectedRealtor(null);
            setFilters(clearedFilters);
            setTempFilters(clearedFilters);
            setSearchInputValue('');
            setSearchTerm('');
            setCurrentPage(0);
            fetchProperties(clearedFilters, '', 0, true, true);
        }
    };
    
    const handleSelectDeveloper = (developer) => {
        if (!developer) {
            // Limpar filtro de construtora (voltar para "Todos")
            handleQuickFilter('all');
            return;
        }
        
        console.log(`🏗️ HomeScreen: Construtora selecionada:`, developer.full_name);
        
        const newFilters = {
            city: '',
            propertyType: [],
            minPrice: '',
            maxPrice: '',
            userType: 'developer',
            developerId: developer.id,
            realtorId: null,
        };
        
        setQuickFilter('developer');
        setSelectedDeveloper(developer);
        setSelectedRealtor(null);
        setFilters(newFilters);
        setTempFilters(newFilters);
        setSearchInputValue('');
        setSearchTerm('');
        setCurrentPage(0);
        fetchProperties(newFilters, '', 0, true, true);
    };
    
    const handleSelectRealtor = (realtor) => {
        if (!realtor) {
            // Limpar filtro de corretor (voltar para "Todos")
            handleQuickFilter('all');
            return;
        }
        
        console.log(`🏢 HomeScreen: Corretor selecionado:`, realtor.full_name);
        
        const newFilters = {
            city: '',
            propertyType: [],
            minPrice: '',
            maxPrice: '',
            userType: 'realtor',
            developerId: null,
            realtorId: realtor.id,
        };
        
        setQuickFilter('realtor');
        setSelectedRealtor(realtor);
        setSelectedDeveloper(null);
        setFilters(newFilters);
        setTempFilters(newFilters);
        setSearchInputValue('');
        setSearchTerm('');
        setCurrentPage(0);
        fetchProperties(newFilters, '', 0, true, true);
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

                console.log('™ï¸ Cidades carregadas:', uniqueCities.length, uniqueCities.slice(0, 5));
                setCities(uniqueCities);
            }
        } catch (error) {
            console.error('âŒ Erro ao buscar cidades:', error);
        }
    };

    // ❌ REMOVIDO: handleToggleFavorite - FavoriteButton agora gerencia diretamente via Zustand

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
    const PropertyItem = React.memo(({ item, index, navigation }) => {
        const mediaFiles = item.images || [];
        // ✅ Usar Zustand para verificar boost (O(1))
        const isPropertyBoosted = isBoosted(item.id);

        // Memoizar o onPress para evitar re-renderizações
        const handlePress = useCallback(() => {
            navigation.navigate('PropertyDetails', { property: item });
        }, [navigation, item]);

        // Separar imagens e vídeos (simplificado)
        const imageFiles = mediaFiles.filter(file =>
            !file.includes('.mp4') && !file.includes('.mov') && !file.includes('.avi') &&
            !file.includes('.mkv') && !file.includes('.webm')
        );

        // Fallback para quando não há imagens
        const defaultImage = 'https://via.placeholder.com/300x200?text=Sem+Imagem';
        const displayImage = imageFiles.length > 0 ? imageFiles[0] : defaultImage;

        return (
            <TouchableOpacity
                style={[
                    styles.propertyCard,
                    isPropertyBoosted && styles.boostedCard
                ]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                {/* Badge de Destaque - Metade dentro, metade fora */}
                {isPropertyBoosted && (
                    <View style={styles.boostBadgeTop}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={styles.boostBadgeText}>Destaque</Text>
                    </View>
                )}

                {/* Foto Lateral */}
                <View style={styles.mediaSection}>
                    {/* Imagem única */}
                    <Image
                        source={{ uri: displayImage }}
                        style={styles.mediaItem}
                        contentFit="cover"
                        cachePolicy="disk"
                        placeholder={require('../assets/placeholder-image.png')}
                        transition={0}
                        priority="normal"
                    />


                    {/* Ãcones de tipo de mÃ­dia */}

                </View>

                {/* Botão de Salvar - Canto superior direito do card */}
                <View style={styles.saveButton}>
                    <FavoriteButton disabled={false} propertyId={item.id} />
                </View>

                <View style={styles.propertyInfo}>
                    <Text style={styles.propertyTitle} numberOfLines={2}>
                        {item.title ?? 'Título indisponível'}
                    </Text>

                    {/* Endereço com ícone */}
                    <View style={styles.addressContainer}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.propertyLocation}>
                            {(() => {
                                // Padrão: Bairro, Cidade. Se não tiver bairro: Endereço, Cidade
                                const neighborhood = item.neighborhood?.trim();
                                const address = item.address?.trim();
                                const city = item.city?.trim() || item.state?.trim();
                                
                                const firstPart = neighborhood || address || '';
                                return [firstPart, city].filter(Boolean).join(', ');
                            })()}
                        </Text>
                    </View>

                    {/* Características com ícones */}
                    <View style={styles.featuresContainer}>
                        {item.bedrooms != null && (
                            <View style={styles.feature}>
                                <Ionicons name="bed-outline" size={16} color="#666" />
                                <Text style={styles.featureText}>{item.bedrooms}</Text>
                            </View>
                        )}
                        {item.bathrooms != null && (
                            <View style={styles.feature}>
                                <Ionicons name="water-outline" size={16} color="#666" />
                                <Text style={styles.featureText}>{item.bathrooms}</Text>
                            </View>
                        )}
                        {item.parking_spaces != null && (
                            <View style={styles.feature}>
                                <Ionicons name="car-outline" size={16} color="#666" />
                                <Text style={styles.featureText}>{item.parking_spaces}</Text>
                            </View>
                        )}
                        {item.area != null && (
                            <View style={styles.feature}>
                                <Ionicons name="resize-outline" size={16} color="#666" />
                                <Text style={styles.featureText}>{`${item.area} m²`}</Text>
                            </View>
                        )}
                    </View>

                    {/* Preço */}
                    <View style={styles.priceContainer}>
                        {((item.sale_price ?? item.salePrice) && parseFloat(item.sale_price ?? item.salePrice) > 0) ? (
                            <View>
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
                    </View>

                    {(item.property_type || item.transaction_type) && (
                        <Text style={styles.propertyType} numberOfLines={1}>
                            {(item.property_type ?? '').toString().trim()}
                            {(item.property_type && item.transaction_type) ? ' - ' : ''}
                            {item.transaction_type === 'rent' ? 'Aluguel' : item.transaction_type === 'sale' ? 'Venda' : item.transaction_type === 'season' ? 'Temporada' : (item.transaction_type ?? '')}
                        </Text>
                    )}
                </View>

            </TouchableOpacity>
        );
    }, (prevProps, nextProps) => {
        // ✨ Só compara o ID do item - FavoriteButton gerencia próprio estado via Zustand
        return prevProps.item.id === nextProps.item.id;
    });

    const renderProperty = useCallback(({ item, index }) => {
        return (
            <PropertyItem
                item={item}
                index={index}
                navigation={navigation}
            />
        );
    }, [navigation]); // ✨ Simplificado - FavoriteButton gerencia próprio estado

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
                        {/* ✨ NOVO: Sininho de notificações */}
                        <NotificationBell navigation={navigation} />
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
                                <TouchableOpacity onPress={openFiltersModal} style={styles.searchFilterButton} activeOpacity={0.7}>
                                    <Ionicons name="options-outline" size={20} color="#00335e" />
                                </TouchableOpacity>
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

                    {/* ✨ NOVO: Segunda linha: Filtros Rápidos (userType) */}
                    <View style={styles.quickFiltersRow}>
                        <TouchableOpacity 
                            style={[
                                styles.quickFilterButton,
                                quickFilter === 'all' && styles.quickFilterButtonActive
                            ]}
                            onPress={() => handleQuickFilter('all')}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.quickFilterText,
                                quickFilter === 'all' && styles.quickFilterTextActive
                            ]}>
                                Todos
                            </Text>
                        </TouchableOpacity>
                        
                        {isAdmin && (
                            <TouchableOpacity 
                                style={[
                                    styles.quickFilterButton,
                                    quickFilter === 'developer' && styles.quickFilterButtonActive
                                ]}
                                onPress={() => handleQuickFilter('developer')}
                                activeOpacity={0.7}
                            >
                                {!isSmallScreen && (
                                    <Ionicons 
                                        name="business" 
                                        size={14} 
                                        color={quickFilter === 'developer' ? '#fff' : '#00335e'} 
                                    />
                                )}
                                <Text style={[
                                    styles.quickFilterText,
                                    quickFilter === 'developer' && styles.quickFilterTextActive
                                ]}>
                                    Construtoras
                                </Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={[
                                styles.quickFilterButton,
                                quickFilter === 'realtor' && styles.quickFilterButtonActive
                            ]}
                            onPress={() => handleQuickFilter('realtor')}
                            activeOpacity={0.7}
                        >
                            {!isSmallScreen && (
                                <Ionicons 
                                    name="people" 
                                    size={14} 
                                    color={quickFilter === 'realtor' ? '#fff' : '#00335e'} 
                                />
                            )}
                            <Text style={[
                                styles.quickFilterText,
                                quickFilter === 'realtor' && styles.quickFilterTextActive
                            ]}>
                                Corretores
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.quickFilterButton,
                                quickFilter === 'owner' && styles.quickFilterButtonActive
                            ]}
                            onPress={() => handleQuickFilter('owner')}
                            activeOpacity={0.7}
                        >
                            {!isSmallScreen && (
                                <Ionicons 
                                    name="home" 
                                    size={14} 
                                    color={quickFilter === 'owner' ? '#fff' : '#00335e'} 
                                />
                            )}
                            <Text style={[
                                styles.quickFilterText,
                                quickFilter === 'owner' && styles.quickFilterTextActive
                            ]}>
                                Proprietários
                            </Text>
                        </TouchableOpacity>
                    </View>

                    
                </View>

                {/* Content: alterna entre lista e mapa embutido */}
                {showMap ? (
                    <View style={styles.mapContainer}>
                        <ClusteredMapView
                            style={styles.map}
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                            initialRegion={{
                                latitude: -27.03,
                                longitude: -48.62,
                                latitudeDelta: 0.35,
                                longitudeDelta: 0.35,
                            }}
                            showsUserLocation={false}
                            showsCompass={true}
                            animationEnabled={true}
                            spiralEnabled={true}
                            clusterColor="#00335e"
                            clusterTextColor="#fff"
                            renderCluster={({ id, geometry, onPress, properties }) => {
                                const count = properties.point_count;
                                const [longitude, latitude] = geometry.coordinates;
                                return (
                                    <Marker key={`cluster-${id}`} coordinate={{ latitude, longitude }} onPress={onPress}>
                                        <View style={styles.clusterContainer}>
                                            <View style={styles.clusterBubble}>
                                                <Text style={styles.clusterText}>{count}</Text>
                                            </View>
                                        </View>
                                    </Marker>
                                );
                            }}
                        >
                            {groupedMarkers.map((group, index) => {
                                const isSelected = selectedProperty && group.properties.some(p => p.id === selectedProperty.id);
                                const hasMultiple = group.properties.length > 1;
                                
                                if (hasMultiple) {
                                    // Marker customizado para múltiplos imóveis
                                    return (
                                        <Marker
                                            key={`map-group-${index}-${group.latitude}-${group.longitude}`}
                                            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                                            onPress={() => handleMarkerPress(group)}
                                        >
                                            <View style={styles.markerWrapper}>
                                                <View style={[
                                                    styles.customMarker,
                                                    isSelected && styles.customMarkerSelected
                                                ]}>
                                                    {Platform.OS === 'ios' && (
                                                        <Ionicons 
                                                            name="business" 
                                                            size={18} 
                                                            color="#fff" 
                                                        />
                                                    )}
                                                    {Platform.OS === 'ios' ? (
                                                        <View style={styles.markerBadge}>
                                                            <Text style={styles.markerBadgeText}>{group.properties.length}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.markerBadgeText}>{group.properties.length}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </Marker>
                                    );
                                } else {
                                    // Marker padrão para imóvel único
                                    return (
                                        <Marker
                                            key={`map-group-${index}-${group.latitude}-${group.longitude}`}
                                            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                                            pinColor={isSelected ? "#e74c3c" : "#00335e"}
                                            onPress={() => handleMarkerPress(group)}
                                        />
                                    );
                                }
                            })}
                        </ClusteredMapView>
                        {(listLoading || isSearching || refreshing) && (
                            <View style={styles.mapLoadingOverlay}>
                                <Text style={styles.mapLoadingText}>Aplicando filtros...</Text>
                            </View>
                        )}
                        
                        {/* Card inferior com propriedade selecionada */}
                        {selectedProperty && !multiplePropertiesModal && (
                            <View style={styles.mapPropertyCard}>
                                <TouchableOpacity
                                    style={styles.mapPropertyCardContent}
                                    onPress={() => navigation.navigate('PropertyDetails', { property: selectedProperty })}
                                    activeOpacity={0.9}
                                >
                                    <Image
                                        source={{ uri: (selectedProperty.images && selectedProperty.images[0]) ? selectedProperty.images[0] : 'https://via.placeholder.com/120x90?text=Foto' }}
                                        style={styles.mapPropertyImage}
                                        contentFit="cover"
                                    />
                                    <View style={styles.mapPropertyInfo}>
                                        <Text style={styles.mapPropertyTitle} numberOfLines={2}>
                                            {selectedProperty.title ?? 'Imóvel'}
                                        </Text>
                                        <Text style={styles.mapPropertyLocation} numberOfLines={1}>
                                            <Ionicons name="location-outline" size={14} color="#64748b" />
                                            {' '}
                                            {(() => {
                                                const neighborhood = selectedProperty.neighborhood?.trim();
                                                const address = selectedProperty.address?.trim();
                                                const city = selectedProperty.city?.trim() || selectedProperty.state?.trim();
                                                const firstPart = neighborhood || address || '';
                                                return [firstPart, city].filter(Boolean).join(', ');
                                            })()}
                                        </Text>
                                        <Text style={styles.mapPropertyPrice}>
                                            {((selectedProperty.sale_price ?? selectedProperty.salePrice) && parseFloat(selectedProperty.sale_price ?? selectedProperty.salePrice) > 0)
                                                ? `R$ ${(selectedProperty.sale_price ?? selectedProperty.salePrice)?.toLocaleString('pt-BR')}`
                                                : `R$ ${selectedProperty.price?.toLocaleString('pt-BR') ?? '—'}`}
                                        </Text>
                                        <View style={styles.mapPropertyButton}>
                                            <Text style={styles.mapPropertyButtonText}>Ver detalhes</Text>
                                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.mapPropertyCloseButton}
                                    onPress={() => setSelectedProperty(null)}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Modal de múltiplos imóveis na mesma localização */}
                        <Modal
                            visible={multiplePropertiesModal}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setMultiplePropertiesModal(false)}
                        >
                            <View style={styles.multiPropertiesModalOverlay}>
                                <View style={styles.multiPropertiesModalContent}>
                                    <View style={styles.multiPropertiesHeader}>
                                        <View>
                                            <Text style={styles.multiPropertiesTitle}>
                                                Imóveis nesta localização
                                            </Text>
                                            <Text style={styles.multiPropertiesSubtitle}>
                                                {propertiesAtLocation.length} imóveis disponíveis
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setMultiplePropertiesModal(false)}
                                            style={styles.multiPropertiesCloseButton}
                                        >
                                            <Ionicons name="close-circle" size={32} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView style={styles.multiPropertiesList}>
                                        {propertiesAtLocation.map((property, index) => (
                                            <TouchableOpacity
                                                key={`multi-prop-${property.id}`}
                                                style={[
                                                    styles.multiPropertyItem,
                                                    index === propertiesAtLocation.length - 1 && styles.multiPropertyItemLast
                                                ]}
                                                onPress={() => handleSelectPropertyFromList(property)}
                                                activeOpacity={0.7}
                                            >
                                                <Image
                                                    source={{ uri: (property.images && property.images[0]) ? property.images[0] : 'https://via.placeholder.com/80?text=Foto' }}
                                                    style={styles.multiPropertyImage}
                                                    contentFit="cover"
                                                />
                                                <View style={styles.multiPropertyInfo}>
                                                    <Text style={styles.multiPropertyTitle} numberOfLines={2}>
                                                        {property.title}
                                                    </Text>
                                                    <Text style={styles.multiPropertyPrice}>
                                                        {((property.sale_price ?? property.salePrice) && parseFloat(property.sale_price ?? property.salePrice) > 0)
                                                            ? `R$ ${(property.sale_price ?? property.salePrice)?.toLocaleString('pt-BR')}`
                                                            : `R$ ${property.price?.toLocaleString('pt-BR') ?? '—'}`}
                                                    </Text>
                                                    <View style={styles.multiPropertyFeatures}>
                                                        {property.bedrooms && (
                                                            <Text style={styles.multiPropertyFeature}>
                                                                <Ionicons name="bed-outline" size={14} /> {property.bedrooms}
                                                            </Text>
                                                        )}
                                                        {property.bathrooms && (
                                                            <Text style={styles.multiPropertyFeature}>
                                                                <Ionicons name="water-outline" size={14} /> {property.bathrooms}
                                                            </Text>
                                                        )}
                                                        {property.area && (
                                                            <Text style={styles.multiPropertyFeature}>
                                                                <Ionicons name="resize-outline" size={14} /> {property.area}m²
                                                            </Text>
                                                        )}
                                                    </View>
                                                </View>
                                                <Ionicons name="chevron-forward" size={24} color="#64748b" />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>
                        </Modal>
                    </View>
                ) : (
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
                )}

                <TouchableOpacity
                    style={styles.floatingMapButton}
                    onPress={() => setShowMap(prev => !prev)}
                    activeOpacity={0.85}
                >
                    <Ionicons name={showMap ? 'list' : 'location'} size={18} color="#fff" />
                    <Text style={styles.floatingMapText}>{showMap ? 'Ver em lista' : 'Ver no mapa'}</Text>
                </TouchableOpacity>

                {/* Modal de Filtros */}
                <FiltersModal
                    visible={showFiltersModal}
                    onClose={closeFiltersModal}
                    filters={tempFilters}
                    onApplyFilters={applyFilters}
                    cities={cities}
                />
                
                {/* ✨ NOVOS: Modais de Filtros Rápidos */}
                <DevelopersFilterModal
                    visible={showDevelopersModal}
                    onClose={() => setShowDevelopersModal(false)}
                    onSelectDeveloper={handleSelectDeveloper}
                    selectedDeveloperId={selectedDeveloper?.id}
                />
                
                <RealtorsFilterModal
                    visible={showRealtorsModal}
                    onClose={() => setShowRealtorsModal(false)}
                    onSelectRealtor={handleSelectRealtor}
                    selectedRealtorId={selectedRealtor?.id}
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
        height: 130, // Altura reduzida jÃ¡ que removemos os botÃµes de admin
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // ✨ Mudado de 'center' para 'space-between'
        marginBottom: 5,
        paddingHorizontal: 15, // ✨ Adicionado padding
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
        marginHorizontal: 12,
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
        flexDirection: 'row', // Layout horizontal
        height: 180, // Altura aumentada para caber todo conteúdo
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    boostedCard: {
        borderColor: '#ffcc1e',
        borderWidth: 3,
        shadowColor: '#ffcc1e',
        shadowOpacity: 0.3,
    },
    boostBadgeTop: {
        position: 'absolute',
        top: -12, // Metade fora do card
        left: 16, // Lado esquerdo, em cima da imagem
        backgroundColor: '#f39c12',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10,
    },
    boostBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Novos estilos para o modelo da imagem
    logoContainer: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    logoText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    updateContainer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    updateText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '500',
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        paddingRight: 60, // espaço para o botão "Selecionar"
    },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        gap: 4,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
        minWidth: 35,
        justifyContent: 'flex-start',
    },
    featureText: {
        fontSize: 11,
        color: '#666',
        marginLeft: 3,
        fontWeight: '400',
    },
    // Media Gallery Styles
    mediaSection: {
        position: 'relative',
        width: 150, // Largura fixa para foto lateral
        height: '100%', // Altura total do card
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f8f9fa',
    },
    mediaList: {
        height: 200,
        flex: 1,
    },
    mediaItem: {
        width: '100%', // Largura total do container
        height: '100%', // Altura total do container
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
    saveButton: {
        position: 'absolute',
        top: 8,
        right: 8,
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
        flex: 1, // Ocupa o espaço restante
        padding: 10,
        backgroundColor: '#fff',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        justifyContent: 'space-between', // Espaça os elementos
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
        fontSize: 14,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 4,
        paddingRight: 60,
        lineHeight: 18,
    },
    propertyLocation: {
        fontSize: 12,
        color: '#64748b',
        flex: 1,
    },
    propertyDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    propertyPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
    },
    priceContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 4,
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
        marginBottom: 1,
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
        marginBottom: 0,
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
    searchFilterButton: {
        padding: 5,
        marginLeft: 6,
        borderRadius: 12,
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

    // Botão flutuante "Ver mapa"
    floatingMapButton: {
        position: 'absolute',
        right: 16,
        bottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00335e',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 100,
    },
    floatingMapText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // ✨ NOVOS: Quick Filters Styles
    quickFiltersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 8,
        gap: isSmallScreen ? 6 : 10, // Gap menor em telas pequenas
    },
    quickFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: isSmallScreen ? 8 : 10,
        paddingHorizontal: isSmallScreen ? 6 : 8, // Padding menor em telas pequenas
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
        gap: 4,
        flex: 1,
        minHeight: 42,
    },
    quickFilterButtonActive: {
        backgroundColor: '#00335e',
        borderColor: '#00335e',
    },
    quickFilterText: {
        fontSize: isSmallScreen ? 10 : 12, // Fonte menor em telas pequenas
        fontWeight: isSmallScreen ? '500' : '600', // Peso menor em telas pequenas
        color: '#00335e',
        textAlign: 'center',
    },
    quickFilterTextActive: {
        color: '#fff',
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
    // Map embedded
    mapContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        flex: 1,
    },
    mapLoadingOverlay: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    mapLoadingText: {
        color: '#00335e',
        fontWeight: '600',
    },
    // Cluster styles
    clusterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    clusterBubble: {
        minWidth: 36,
        height: 36,
        paddingHorizontal: 6,
        borderRadius: 18,
        backgroundColor: '#00335e',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    clusterText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 13,
        paddingHorizontal: 4,
    },
    // Map property card (card inferior no mapa)
    mapPropertyCard: {
        position: 'absolute',
        bottom: 60,
        left: 15,
        right: 15,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    mapPropertyCardContent: {
        flexDirection: 'row',
    },
    mapPropertyImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        backgroundColor: '#e5e7eb',
    },
    mapPropertyInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    mapPropertyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00335e',
        marginBottom: 4,
    },
    mapPropertyLocation: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 4,
    },
    mapPropertyPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: '#059669',
        marginBottom: 8,
    },
    mapPropertyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00335e',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
    },
    mapPropertyButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    mapPropertyCloseButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
        backgroundColor: '#f3f4f6',
        borderRadius: 20,
    },
    
    // Wrapper para Android (overflow visible é crítico)
    markerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    // Marker customizado - ESTILOS DIFERENTES POR PLATAFORMA
    customMarker: Platform.select({
        ios: {
            // iOS - Design retangular horizontal (como estava funcionando bem)
            backgroundColor: '#00335e',
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
        },
        android: {
            // Android - Círculo amarelo simples (diferente dos clusters azuis)
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ffcc1e',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 6,
            borderWidth: 2,
            borderColor: '#fff',
        },
    }),
    customMarkerSelected: {
        backgroundColor: '#e74c3c',
    },
    // Badge - ESTILOS DIFERENTES POR PLATAFORMA
    markerBadge: Platform.select({
        ios: {
            // iOS - Badge inline (dentro do retângulo)
            backgroundColor: '#ffcc1e',
            borderRadius: 10,
            minWidth: 22,
            height: 22,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
        },
        android: {
            // Android - Não usa badge separado (número vai direto no círculo)
            display: 'none',
        },
    }),
    markerBadgeText: Platform.select({
        ios: {
            fontSize: 11,
            color: '#00335e',
            fontWeight: 'bold',
        },
        android: {
            // Android - Número direto no círculo amarelo
            fontSize: 16,
            color: '#00335e',
            fontWeight: 'bold',
        },
    }),
    
    // Modal de múltiplos imóveis
    multiPropertiesModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    multiPropertiesModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    multiPropertiesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    multiPropertiesTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 4,
    },
    multiPropertiesSubtitle: {
        fontSize: 14,
        color: '#64748b',
    },
    multiPropertiesCloseButton: {
        padding: 4,
    },
    multiPropertiesList: {
        paddingHorizontal: 20,
    },
    multiPropertyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 12,
    },
    multiPropertyItemLast: {
        borderBottomWidth: 0,
    },
    multiPropertyImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    multiPropertyInfo: {
        flex: 1,
        gap: 4,
    },
    multiPropertyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    multiPropertyPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#059669',
    },
    multiPropertyFeatures: {
        flexDirection: 'row',
        gap: 12,
    },
    multiPropertyFeature: {
        fontSize: 13,
        color: '#64748b',
        flexDirection: 'row',
        alignItems: 'center',
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
        overflow: 'hidden',
        paddingbottom: 10, // Evita que o conteÃºdo extrapole
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
