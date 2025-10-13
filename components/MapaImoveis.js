/**
 * Componente MapaImoveis - Mapa com markers de propriedades
 * Versão simplificada para evitar problemas de dependências
 */

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { PropertyService } from '../lib/propertyService';


// Cache estático para propriedades do mapa
let mapPropertiesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export default function MapaImoveis({ navigation, route }) {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [mapRegion, setMapRegion] = useState(null); // Começar sem região definida
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [visibleRegion, setVisibleRegion] = useState(null);

    // Receber filtros da HomeScreen (se houver)
    const filters = route?.params?.filters || {};

    // Função para abrir bottom sheet com detalhes da propriedade
    const openPropertySheet = (property) => {
        console.log('📍 Abrindo bottom sheet para:', property.title);
        setSelectedProperty(property);
    };

    // Função para fechar bottom sheet
    const closeSheet = () => {
        setSelectedProperty(null);
    };

    // Função para obter cor do marker baseada no tipo de transação
    const getMarkerColor = (property) => {
        return property.transaction_type === 'rent' ? 'green' : 'red';
    };

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
                return null;
            }

            try {
                return (
                    <Marker
                        key={`marker-${property.id}`}
                        coordinate={{ latitude: lat, longitude: lng }}
                        pinColor={getMarkerColor(property)}
                        onPress={() => openPropertySheet(property)}
                        tracksViewChanges={false}
                        flat={Platform.OS === 'ios'}
                        stopPropagation={true}
                    />
                );
            } catch (error) {
                console.error('❌ Erro ao criar marker:', error, property.title);
                return null;
            }
        }).filter(Boolean);
    }, [properties, visibleRegion]);



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
                latitude: -27.096666, // Itajaí como padrão
                longitude: -48.616408,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
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
                latitude: -27.096666,
                longitude: -48.616408,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
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
    const loadProperties = async () => {
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
            const data = await PropertyService.getPropertiesForMap(filters);
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    Mapa de Imóveis ({properties.length})
                </Text>

                <TouchableOpacity
                    style={styles.styleButton}
                    onPress={() => {
                        // Centralizar em todas as propriedades
                        if (properties.length > 0) {
                            setMapRegion({
                                latitude: -27.147157,
                                longitude: -48.5866543,
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            });
                        }
                    }}
                >
                    <Ionicons name="locate" size={24} color="#00335e" />
                </TouchableOpacity>
            </View>

            {/* Mapa Real */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                    initialRegion={{
                        latitude: -26.91884, // Itajaí como região inicial padrão
                        longitude: -48.673108,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                    //region={mapRegion}
                    showsUserLocation={true}
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
                >
                    {/* Markers memoizados para máxima performance */}
                    {markersToRender}
                </MapView>

            </View>

            {/* Bottom Sheet com preview da propriedade */}
            {selectedProperty && (
                <View style={styles.bottomSheet}>
                    {/* Handle para indicar que é arrastável */}
                    <View style={styles.bottomSheetHandle} />

                    <TouchableOpacity
                        style={styles.bottomSheetContent}
                        onPress={() => {
                            closeSheet();
                            console.log('📍 Navegando para PropertyDetails');
                            navigation.navigate('PropertyDetails', { property: selectedProperty });
                        }}
                        activeOpacity={0.8}
                    >
                        {/* Botão fechar */}
                        <TouchableOpacity
                            style={styles.closeButtonSheet}
                            onPress={closeSheet}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={20} color="#6b7280" />
                        </TouchableOpacity>

                        <View style={styles.sheetRow}>
                            {/* Imagem pequena */}
                            <View style={styles.sheetImageContainer}>
                                {selectedProperty.images && selectedProperty.images.length > 0 ? (
                                    <Image
                                        source={{ uri: selectedProperty.images[0] }}
                                        style={styles.sheetImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.sheetPlaceholderImage}>
                                        <Ionicons name="home" size={30} color="#bdc3c7" />
                                    </View>
                                )}
                            </View>

                            {/* Informações resumidas */}
                            <View style={styles.sheetInfo}>
                                <Text style={styles.sheetTitle} numberOfLines={2}>
                                    {selectedProperty.title}
                                </Text>

                                {/* Preço */}
                                <View style={styles.sheetPriceContainer}>
                                    {selectedProperty.sale_price && selectedProperty.sale_price > 0 ? (
                                        <>
                                            <Text style={styles.sheetOriginalPrice}>
                                                R$ {selectedProperty.price?.toLocaleString('pt-BR')}
                                            </Text>
                                            <Text style={styles.sheetSalePrice}>
                                                R$ {selectedProperty.sale_price.toLocaleString('pt-BR')}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={styles.sheetMainPrice}>
                                            R$ {selectedProperty.price?.toLocaleString('pt-BR')}
                                        </Text>
                                    )}
                                    <Text style={styles.sheetTransactionType}>
                                        {selectedProperty.transaction_type === 'rent' ? 'Aluguel' : 'Venda'}
                                    </Text>
                                </View>

                                {/* Localização resumida */}
                                <View style={styles.sheetLocation}>
                                    <Ionicons name="location" size={14} color="#6b7280" />
                                    <Text style={styles.sheetLocationText} numberOfLines={1}>
                                        {selectedProperty.neighborhood} - {selectedProperty.city}
                                    </Text>
                                </View>

                                {/* Características resumidas */}
                                <View style={styles.sheetFeatures}>
                                    {selectedProperty.bedrooms && (
                                        <View style={styles.sheetFeature}>
                                            <Ionicons name="bed" size={12} color="#6b7280" />
                                            <Text style={styles.sheetFeatureText}>{selectedProperty.bedrooms}</Text>
                                        </View>
                                    )}
                                    {selectedProperty.bathrooms && (
                                        <View style={styles.sheetFeature}>
                                            <Ionicons name="water" size={12} color="#6b7280" />
                                            <Text style={styles.sheetFeatureText}>{selectedProperty.bathrooms}</Text>
                                        </View>
                                    )}
                                    {selectedProperty.parking_spaces && (
                                        <View style={styles.sheetFeature}>
                                            <Ionicons name="car" size={12} color="#6b7280" />
                                            <Text style={styles.sheetFeatureText}>{selectedProperty.parking_spaces}</Text>
                                        </View>
                                    )}
                                    {selectedProperty.area && (
                                        <View style={styles.sheetFeature}>
                                            <Ionicons name="resize" size={12} color="#6b7280" />
                                            <Text style={styles.sheetFeatureText}>{selectedProperty.area}m²</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Seta indicando que é clicável */}
                            <View style={styles.sheetArrow}>
                                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            )}
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
    // Estilos para bottom sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#d1d5db',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 5,
    },
    bottomSheetContent: {
        padding: 16,
    },
    closeButtonSheet: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    sheetImageContainer: {
        marginRight: 12,
    },
    sheetImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    sheetPlaceholderImage: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetInfo: {
        flex: 1,
        paddingRight: 8,
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        lineHeight: 20,
    },
    sheetPriceContainer: {
        marginBottom: 8,
    },
    sheetMainPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#059669',
    },
    sheetOriginalPrice: {
        fontSize: 14,
        color: '#dc2626',
        textDecorationLine: 'line-through',
    },
    sheetSalePrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#059669',
        marginTop: 2,
    },
    sheetTransactionType: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 2,
        textTransform: 'uppercase',
    },
    sheetLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sheetLocationText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
        flex: 1,
    },
    sheetFeatures: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sheetFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    sheetFeatureText: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 2,
    },
    sheetArrow: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 24,
        height: 24,
    },
});