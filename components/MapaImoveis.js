/**
 * Componente MapaImoveis - Mapa com markers de propriedades
 * Versão simplificada para evitar problemas de dependências
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

import { PropertyService } from '../lib/propertyService';

const { width, height } = Dimensions.get('window');

export default function MapaImoveis({ navigation, route }) {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: -23.5505, // São Paulo como padrão
        longitude: -46.6333,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
    });

    // Receber filtros da HomeScreen (se houver)
    const filters = route?.params?.filters || {};

    useEffect(() => {
        console.log('🗺️ MapaImoveis: Componente montado');
        initializeMap();
    }, []);

    const initializeMap = async () => {
        // Carregar propriedades primeiro
        await loadProperties();

        // Depois tentar obter localização
        await requestLocationPermission();

        // Se não conseguiu localização, usar localização da primeira propriedade
        if (properties.length > 0) {
            const firstProperty = properties[0];
            const lat = parseFloat(firstProperty.latitude);
            const lng = parseFloat(firstProperty.longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
                setMapRegion({
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                });
            }
        }

        // Garantir que loading seja false
        setLoading(false);

        // Timeout de segurança - se mapa não carregar em 10s, forçar loading = false
        setTimeout(() => {
            if (loading) {
                console.log('⏰ Timeout do mapa - forçando carregamento');
                setLoading(false);
            }
        }, 10000);
    };

    useEffect(() => {
        console.log('🗺️ Região do mapa atualizada:', mapRegion);
    }, [mapRegion]);

    /**
     * Solicitar permissão de localização e obter posição atual
     */
    const requestLocationPermission = async () => {
        try {
            console.log('📍 Solicitando permissão de localização...');

            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log('⚠️ Permissão de localização negada');
                return;
            }

            console.log('✅ Permissão de localização concedida');

            // Obter localização atual
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;
            console.log('📍 Localização atual:', { latitude, longitude });

            // Atualizar região para a localização do usuário
            setMapRegion(prev => ({
                ...prev,
                latitude,
                longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            }));

        } catch (error) {
            console.error('❌ Erro ao obter localização:', error);
        }
    };

    /**
     * Carregar propriedades do Supabase
     */
    const loadProperties = async () => {
        try {
            console.log('📍 Buscando propriedades para o mapa...');

            // Usar método otimizado para mapa
            const data = await PropertyService.getPropertiesForMap(filters);
            console.log(`✅ ${data.length} propriedades carregadas para o mapa`);

            setProperties(data);

            // Ajustar região do mapa para as propriedades encontradas
            if (data && data.length > 0) {
                const firstProperty = data[0];
                const lat = parseFloat(firstProperty.latitude);
                const lng = parseFloat(firstProperty.longitude);

                if (!isNaN(lat) && !isNaN(lng)) {
                    console.log('🗺️ Ajustando região do mapa para:', { lat, lng });
                    setMapRegion({
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                }
            }

        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);
            Alert.alert('Erro', 'Não foi possível carregar os imóveis no mapa');
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
                        latitude: -26.91884,
                        longitude: -48.673108,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    loadingEnabled={false}
                    onMapReady={() => {
                        console.log('🗺️ Mapa carregado com API key!');
                        setMapReady(true);
                        setLoading(false);
                    }}
                    onError={(error) => {
                        console.error('❌ Erro no mapa:', error);
                        setLoading(false);
                    }}
                    mapType="standard"
                >
                    {/* Marker de teste fixo */}
                    <Marker
                        coordinate={{
                            latitude: -26.91884,
                            longitude: -48.673108,
                        }}
                        title="🏠 Propriedade Teste"
                        description="Itajaí - SC - R$ 450.000"
                        pinColor="red"
                        onPress={() => {
                            console.log('📍 Marker de teste pressionado!');
                        }}
                    />

                    {/* Markers das propriedades reais */}
                    {properties.map((property, index) => {
                        const lat = parseFloat(property.latitude);
                        const lng = parseFloat(property.longitude);

                        if (isNaN(lat) || isNaN(lng)) {
                            console.log(`⚠️ Coordenadas inválidas para ${property.title}`);
                            return null;
                        }

                        console.log(`📍 Renderizando marker: ${property.title} (${lat}, ${lng})`);

                        return (
                            <Marker
                                key={`marker-${property.id}`}
                                coordinate={{ latitude: lat, longitude: lng }}
                                title={property.title}
                                description={`R$ ${property.price?.toLocaleString('pt-BR')}`}
                                pinColor="green"
                                onPress={() => {
                                    console.log('📍 Marker pressionado:', property.title);
                                    navigation.navigate('PropertyDetails', { property });
                                }}
                            />
                        );
                    })}
                </MapView>

                {/* Informações sobre o mapa */}
                <View style={styles.mapInfo}>
                    <Text style={styles.mapInfoText}>
                        📍 {properties.length} imóveis no mapa
                    </Text>
                </View>
            </View>
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
    mapInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    mapInfoText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    // Estilos para versão Android alternativa
    androidMapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    placeholderTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 15,
        marginBottom: 10,
    },
    placeholderText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 20,
    },
    propertyMapItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    propertyMapInfo: {
        flex: 1,
        marginRight: 10,
    },
    propertyMapTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    propertyMapPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#059669',
        marginBottom: 4,
    },
    propertyMapLocation: {
        fontSize: 14,
        color: '#6b7280',
    },
});