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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

import { PropertyService } from '../lib/propertyService';

const { width, height } = Dimensions.get('window');

export default function MapaImoveis({ navigation, route }) {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
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
        loadProperties();
    }, []);

    /**
     * Carregar propriedades do Supabase
     */
    const loadProperties = async () => {
        try {
            setLoading(true);
            console.log('📍 Buscando propriedades para o mapa...');

            // Usar método otimizado para mapa
            const data = await PropertyService.getPropertiesForMap(filters);
            console.log(`✅ ${data.length} propriedades carregadas para o mapa`);

            setProperties(data);

        } catch (error) {
            console.error('❌ Erro ao carregar propriedades:', error);
            Alert.alert('Erro', 'Não foi possível carregar os imóveis no mapa');
        } finally {
            setLoading(false);
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
                    onPress={loadProperties}
                >
                    <Ionicons name="refresh" size={24} color="#00335e" />
                </TouchableOpacity>
            </View>

            {/* Mapa Real */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    loadingEnabled={true}
                    loadingIndicatorColor="#00335e"
                    loadingBackgroundColor="#fff"
                >
                    {/* Renderizar markers das propriedades */}
                    {properties.map((property, index) => {
                        // Validar coordenadas
                        const lat = parseFloat(property.latitude);
                        const lng = parseFloat(property.longitude);

                        if (isNaN(lat) || isNaN(lng)) {
                            console.log(`⚠️ Coordenadas inválidas para ${property.title}:`, { lat, lng });
                            return null;
                        }

                        // Determinar cor do marker
                        let pinColor = '#059669'; // Verde padrão (venda)
                        if (property.transaction_type === 'rent' || property.transaction_type === 'aluguel') {
                            pinColor = '#3b82f6'; // Azul para aluguel
                        }
                        if (property.sale_price && property.sale_price > 0) {
                            pinColor = '#dc2626'; // Vermelho para promoção
                        }

                        return (
                            <Marker
                                key={`marker-${property.id}`}
                                coordinate={{
                                    latitude: lat,
                                    longitude: lng,
                                }}
                                title={property.title}
                                description={`R$ ${property.price?.toLocaleString('pt-BR')} - ${property.city}`}
                                pinColor={pinColor}
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
});