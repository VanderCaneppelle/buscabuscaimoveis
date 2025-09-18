/**
 * Componente MapaImovelUnico - Mapa focado em uma propriedade específica
 * Sem bottom sheet, sem outros markers, apenas o imóvel selecionado
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';

export default function MapaImovelUnico({ navigation, route }) {
    const { property } = route.params;
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);

    // Região do mapa centralizada na propriedade
    const mapRegion = {
        latitude: parseFloat(property.latitude),
        longitude: parseFloat(property.longitude),
        latitudeDelta: 0.005, // Zoom bem próximo
        longitudeDelta: 0.005,
    };

    // Função para obter cor do marker baseada no tipo de transação
    const getMarkerColor = (property) => {
        return property.transaction_type === 'rent' ? 'green' : 'red';
    };

    useEffect(() => {
        console.log('🎯 MapaImovelUnico: Focando em', property.title);
        // Parar loading após um pequeno delay para suavizar
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00335e" />
                <Text style={styles.loadingText}>Carregando localização...</Text>
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

                <Text style={styles.headerTitle} numberOfLines={1}>
                    📍 {property.title}
                </Text>

                <View style={styles.headerSpacer} />
            </View>

            {/* Mapa Focado na Propriedade */}
            <View style={styles.mapContainer}>
                <MapView
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                    initialRegion={mapRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    loadingEnabled={false}
                    onMapReady={() => {
                        console.log('🎯 Mapa focado carregado!');
                        setMapReady(true);
                    }}
                    mapType="standard"
                >
                    {/* Marker único da propriedade */}
                    <Marker
                        coordinate={{
                            latitude: parseFloat(property.latitude),
                            longitude: parseFloat(property.longitude)
                        }}
                        title={property.title}
                        description={`R$ ${property.price?.toLocaleString('pt-BR')} - ${property.transaction_type === 'rent' ? 'Aluguel' : 'Venda'}`}
                        pinColor={getMarkerColor(property)}
                    />
                </MapView>

                {/* Informações da propriedade fixas no bottom */}
                <View style={styles.propertyInfo}>
                    <View style={styles.propertyHeader}>
                        <Text style={styles.propertyTitle} numberOfLines={2}>
                            {property.title}
                        </Text>
                        <Text style={styles.propertyPrice}>
                            R$ {property.price?.toLocaleString('pt-BR')}
                        </Text>
                    </View>

                    <View style={styles.propertyLocation}>
                        <Ionicons name="location" size={16} color="#6b7280" />
                        <Text style={styles.locationText}>
                            {property.address}, {property.neighborhood} - {property.city}/{property.state}
                        </Text>
                    </View>

                    {/* Características básicas */}
                    <View style={styles.propertyFeatures}>
                        {property.bedrooms && (
                            <View style={styles.feature}>
                                <Ionicons name="bed" size={16} color="#6b7280" />
                                <Text style={styles.featureText}>{property.bedrooms} quartos</Text>
                            </View>
                        )}
                        {property.bathrooms && (
                            <View style={styles.feature}>
                                <Ionicons name="water" size={16} color="#6b7280" />
                                <Text style={styles.featureText}>{property.bathrooms} banheiros</Text>
                            </View>
                        )}
                        {property.area && (
                            <View style={styles.feature}>
                                <Ionicons name="resize" size={16} color="#6b7280" />
                                <Text style={styles.featureText}>{property.area}m²</Text>
                            </View>
                        )}
                    </View>
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
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00335e',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    headerSpacer: {
        width: 34, // Mesmo tamanho do botão back
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    propertyInfo: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    propertyHeader: {
        marginBottom: 8,
    },
    propertyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    propertyPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#059669',
    },
    propertyLocation: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    locationText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 6,
        flex: 1,
        lineHeight: 18,
    },
    propertyFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        marginBottom: 4,
    },
    featureText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 4,
    },
});
