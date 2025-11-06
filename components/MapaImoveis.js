/**
 * Componente MapaImoveis - Mapa com markers de propriedades
 * Versão simplificada para evitar problemas de dependências
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Image,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import * as Location from 'expo-location';

import { PropertyService } from '../lib/propertyService';
import { FiltersModal } from './modals';


// Cache estático para propriedades do mapa
let mapPropertiesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default function MapaImoveis({ navigation, route }) {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applyingFilters, setApplyingFilters] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [mapRegion, setMapRegion] = useState(null); // Começar sem região definida
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [visibleRegion, setVisibleRegion] = useState(null);
    const searchInputRef = useRef(null);

    // Receber filtros da HomeScreen (se houver)
    const [filters, setFilters] = useState(route?.params?.filters || {});
    const [showFiltersModal, setShowFiltersModal] = useState(false);
    const [tempFilters, setTempFilters] = useState(route?.params?.filters || {});
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInputValue, setSearchInputValue] = useState('');


    // Cor única para markers individuais (igual ao cluster)
    const getMarkerColor = () => '#00335e';

    // Função para validar região e evitar crashes
    const isValidRegion = (region) => {
        if (!region) return false;

        const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

        return (
            typeof latitude === 'number' && !isNaN(latitude) &&
            typeof longitude === 'number' && !isNaN(longitude) &&
            typeof latitudeDelta === 'number' && !isNaN(latitudeDelta) &&
            typeof longitudeDelta === 'number' && !isNaN(longitudeDelta) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            latitudeDelta > 0 && latitudeDelta <= 180 &&
            longitudeDelta > 0 && longitudeDelta <= 360
        );
    };

    // Função otimizada para filtrar propriedades dentro do viewport
    const filterPropertiesInViewport = (allProperties, region) => {
        // Limite mais restritivo para iOS para evitar crashes
        const maxMarkers = Platform.OS === 'ios' ? 25 : 50;
        if (!region) return allProperties.slice(0, maxMarkers); // Fallback com limite

        const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

        const minLat = latitude - latitudeDelta / 2;
        const maxLat = latitude + latitudeDelta / 2;
        const minLng = longitude - longitudeDelta / 2;
        const maxLng = longitude + longitudeDelta / 2;

        const filtered = allProperties.filter(property => {
            const lat = parseFloat(property.latitude);
            const lng = parseFloat(property.longitude);

            return !isNaN(lat) && !isNaN(lng) &&
                lat >= minLat && lat <= maxLat &&
                lng >= minLng && lng <= maxLng;
        });

        // Filtro aplicado silenciosamente para performance
        return filtered.slice(0, maxMarkers);
    };

    // Debounce para evitar atualizações excessivas durante navegação (iOS precisa de mais tempo)
    const debouncedRegionChange = debounce((region) => {
    setVisibleRegion(region);
    }, Platform.OS === 'ios' ? 1200 : 300); // iOS = 1,2s, Android = 0,3s 

    // Handler para mudanças de região com debounce
    const handleRegionChangeComplete = (region) => {
        debouncedRegionChange(region);
    };

    // Memoizar markers para evitar re-renderizações desnecessárias
    const markersToRender = useMemo(() => {
        if (!visibleRegion) return [];

        const filtered = filterPropertiesInViewport(properties, visibleRegion);

        return filtered.map((property, index) => {
            const lat = parseFloat(property.latitude);
            const lng = parseFloat(property.longitude);

            // Validação robusta de coordenadas para evitar crashes no iOS
            if (isNaN(lat) || isNaN(lng) ||
                lat < -90 || lat > 90 ||
                lng < -180 || lng > 180) {
                console.log(`⚠️ Coordenadas inválidas ignoradas: ${property.title} (${lat}, ${lng})`);
                console.log(`🔍 DEBUG - Raw coordinates: lat=${property.latitude}, lng=${property.longitude}`);
                return null;
            }

            try {
                return (
                    <Marker
                        key={`marker-${property.id}`}
                        coordinate={{ latitude: lat, longitude: lng }}
                        pinColor={selectedProperty?.id === property.id ? "#e74c3c" : getMarkerColor(property)}
                        tracksViewChanges={false}
                        onPress={() => setSelectedProperty(property)}
                    />
                );
            } catch (error) {
                console.error('❌ Erro ao criar marker:', error, property.title);
                return null;
            }
        }).filter(Boolean);
    }, [properties, visibleRegion, selectedProperty]);



    // Error boundary removido para reduzir overhead no iOS

    useEffect(() => {
        console.log('🗺️ MapaImoveis: Componente montado');
        initializeMap();
    }, []);

    const initializeMap = async () => {
        console.log('🗺️ Iniciando mapa geral...');

        // Definir região padrão imediatamente para abrir o mapa rápido
        if (!mapRegion) {
            setMapRegion({
                latitude: -27.03, // centro aproximado entre Itajaí, BC, Itapema e Porto Belo
                longitude: -48.62,
                latitudeDelta: 0.35,
                longitudeDelta: 0.35,
            });
            console.log('🗺️ Região padrão definida - mapa abre instantaneamente');
        }

        // Carregar propriedades (pode usar cache)
        await loadProperties();

        // Parar loading para mostrar o mapa
        setLoading(false);

        // Buscar localização do usuário em background
        requestLocationPermission().then(() => {
            console.log('📍 Localização obtida em background');
        }).catch(error => {
            console.log('📍 Erro ao obter localização em background:', error);
        });
    };

    useEffect(() => {
        console.log('🗺️ Região do mapa atualizada:', mapRegion);
    }, [mapRegion]);

    // Definir região inicial quando o mapa carrega
    useEffect(() => {
        if (properties.length > 0 && mapReady && !visibleRegion) {
            const initialRegion = mapRegion || {
                latitude: -27.03,
                longitude: -48.62,
                latitudeDelta: 0.35,
                longitudeDelta: 0.35,
            };
            setVisibleRegion(initialRegion);
        }
    }, [properties, mapReady, mapRegion]);

    /**
     * Solicitar permissão de localização e obter posição atual
     */
    const requestLocationPermission = async () => {
        try {
            console.log('📍 Solicitando permissão de localização...');

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('⚠️ Permissão de localização negada');
                return false;
            }

            console.log('✅ Permissão de localização concedida');

            // Obter localização atual
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;
            console.log('📍 Localização atual obtida:', { latitude, longitude });

            // Atualizar região do mapa para a localização do usuário (suavemente)
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.05, // Zoom próximo para ver propriedades locais
                longitudeDelta: 0.05,
            };

            // Validar região antes de aplicar (evitar crashes)
            if (isValidRegion(newRegion)) {
                setMapRegion(newRegion);
                console.log('🗺️ Região atualizada para localização do usuário');
            } else {
                console.warn('⚠️ Região inválida ignorada:', newRegion);
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao obter localização:', error);
            return false;
        }
    };

    /**
     * Carregar propriedades do Supabase com cache otimizado
     */
    const loadProperties = async (customFilters = filters, customSearch = searchTerm) => {
        try {
            // Verificar se o cache ainda é válido
            const now = Date.now();
            const cacheAge = now - cacheTimestamp;
            const isCacheValid = mapPropertiesCache && cacheAge < CACHE_DURATION;

            if (isCacheValid) {
                console.log(`📦 Usando cache do mapa (${Math.round(cacheAge / 1000)}s atrás)`);
                setProperties(mapPropertiesCache);
                return;
            }

            console.log('🗺️ Buscando propriedades para o mapa...');

            // Buscar do servidor
            const data = await PropertyService.getPropertiesForMap({ ...customFilters, searchTerm: customSearch });
            console.log(`✅ ${data.length} propriedades carregadas do servidor`);

            // Atualizar cache
            mapPropertiesCache = data;
            cacheTimestamp = now;

            setProperties(data);

        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);

            // Se houver cache, usar como fallback
            if (mapPropertiesCache) {
                console.log('📦 Usando cache como fallback após erro');
                setProperties(mapPropertiesCache);
            } else {
                Alert.alert('Erro', 'Não foi possível carregar os imóveis no mapa');
            }
        }
    };

    const openFilters = () => {
        setTempFilters(filters);
        setShowFiltersModal(true);
    };

    const applyFilters = async (newFilters = tempFilters) => {
        setShowFiltersModal(false);
        setApplyingFilters(true);
        setFilters(newFilters);
        await loadProperties(newFilters, searchTerm);
        setApplyingFilters(false);
    };

    const executeSearch = async () => {
        setApplyingFilters(true);
        setSearchTerm(searchInputValue);
        await loadProperties(filters, searchInputValue);
        setApplyingFilters(false);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00335e" />
                <Text style={styles.loadingText}>Carregando mapa...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header compacto com busca e filtros (mantém a mesma linguagem visual da Home) */}
            <View style={styles.headerSearch}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Buscar imóveis..."
                        placeholderTextColor="#7f8c8d"
                        value={searchInputValue}
                        onChangeText={setSearchInputValue}
                        returnKeyType="search"
                        onSubmitEditing={executeSearch}
                    />
                    {searchInputValue.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchInputValue(''); setSearchTerm(''); executeSearch(); }} style={styles.clearSearchButton}>
                            <Ionicons name="close-circle" size={20} color="#7f8c8d" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={openFilters} style={styles.searchFilterButton} activeOpacity={0.7}>
                        <Ionicons name="options-outline" size={20} color="#00335e" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.searchButton, searchInputValue.trim() && styles.searchButtonActive]}
                    onPress={executeSearch}
                    activeOpacity={0.8}
                    disabled={!searchInputValue.trim()}
                >
                    <Ionicons name="search" size={18} color={searchInputValue.trim() ? '#fff' : '#7f8c8d'} />
                </TouchableOpacity>
            </View>

            {/* Mapa Real */}
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
                    //region={mapRegion}
                    showsUserLocation={false}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    loadingEnabled={false}
                    onMapReady={() => {
                        console.log('🗺️ Mapa com viewport loading carregado!');
                        setMapReady(true);
                        setLoading(false);
                    }}
                    onError={(error) => {
                        console.error('❌ Erro no mapa:', error);
                        setLoading(false);
                    }}
                    onRegionChangeComplete={handleRegionChangeComplete}
                    mapType="standard"
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
                    {/* Markers memoizados para máxima performance */}
                    {markersToRender}
                </ClusteredMapView>
                {applyingFilters && (
                    <View style={styles.mapLoadingOverlay}>
                        <ActivityIndicator size="small" color="#00335e" />
                        <Text style={styles.mapLoadingText}>Aplicando filtros...</Text>
                    </View>
                )}
            </View>

            {/* Card inferior com propriedade selecionada */}
            {selectedProperty && (
                <View style={styles.mapPropertyCard}>
                    <TouchableOpacity
                        style={styles.mapPropertyCardContent}
                        onPress={() => navigation.navigate('PropertyDetails', { property: selectedProperty })}
                        activeOpacity={0.9}
                    >
                        <Image
                            source={{ uri: (selectedProperty.images && selectedProperty.images[0]) ? selectedProperty.images[0] : 'https://via.placeholder.com/120x90?text=Foto' }}
                            style={styles.mapPropertyImage}
                            resizeMode="cover"
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
                                {(selectedProperty.sale_price && parseFloat(selectedProperty.sale_price) > 0)
                                    ? `R$ ${selectedProperty.sale_price.toLocaleString('pt-BR')}`
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
            {/* Modal de Filtros para o mapa */}
            <FiltersModal
                visible={showFiltersModal}
                onClose={() => setShowFiltersModal(false)}
                filters={tempFilters}
                onApplyFilters={applyFilters}
                cities={undefined}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#64748b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#ffcc1e',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    styleButton: {
        padding: 5,
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    // Map property card (card inferior no mapa)
    mapPropertyCard: {
        position: 'absolute',
        bottom: 20,
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
    // Cluster styles (idênticos aos da Home para consistência)
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
});