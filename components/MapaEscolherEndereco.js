import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Modal
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { reverseGeocode, testMapboxToken } from '../lib/geocodingService';

const MapaEscolherEndereco = ({ onAddressSelect, onCancel }) => {

    const [mapRegion, setMapRegion] = useState({
        latitude: -26.91884, // Itajaí como padrão
        longitude: -48.673108,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [selectedCoordinate, setSelectedCoordinate] = useState(null);
    const [addressInfo, setAddressInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(true);

    useEffect(() => {
        requestLocationPermission();
    }, []);

    const requestLocationPermission = async () => {
        try {
            // Verificar se já temos permissão
            let { status } = await Location.getForegroundPermissionsAsync();

            if (status !== 'granted') {
                status = (await Location.requestForegroundPermissionsAsync()).status;
            }

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Platform.OS === 'ios' ? Location.Accuracy.High : Location.Accuracy.Balanced,
                    timeout: 10000,
                    maximumAge: 60000,
                });

                const { latitude, longitude } = location.coords;
                const newRegion = {
                    latitude,
                    longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };

                setMapRegion(newRegion);
                setSelectedCoordinate({ latitude, longitude });
            } else {
                console.log('📍 Permissão de localização negada, usando localização padrão');
            }
        } catch (error) {
            console.error('❌ Erro ao obter localização:', error);
        } finally {
            setLoadingLocation(false);
        }
    };

    const handleMapPress = async (event) => {
        const coordinate = event.nativeEvent.coordinate;
        console.log('📍 Coordenada selecionada:', coordinate);

        setSelectedCoordinate(coordinate);
        setAddressInfo(null);
        setLoading(true);

        try {
            // Adicionar timeout para evitar travamento
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: operação demorou muito')), 10000)
            );

            const addressPromise = reverseGeocode(coordinate.latitude, coordinate.longitude);
            const address = await Promise.race([addressPromise, timeoutPromise]);

            if (address) {
                setAddressInfo(address);
                console.log('✅ Endereço obtido:', address);
            } else {
                Alert.alert('Aviso', 'Não foi possível obter o endereço desta localização.');
            }
        } catch (error) {
            console.error('❌ Erro ao obter endereço:', error);
            if (error.message.includes('Timeout')) {
                Alert.alert('Timeout', 'A operação demorou muito. Tente novamente.');
            } else {
                Alert.alert('Erro', 'Falha ao obter endereço. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleMarkerDragEnd = async (event) => {
        const coordinate = event.nativeEvent.coordinate;
        console.log('📍 Marker arrastado para:', coordinate);

        setSelectedCoordinate(coordinate);
        setAddressInfo(null);
        setLoading(true);

        try {
            // Adicionar timeout para evitar travamento
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: operação demorou muito')), 10000)
            );

            const addressPromise = reverseGeocode(coordinate.latitude, coordinate.longitude);
            const address = await Promise.race([addressPromise, timeoutPromise]);

            if (address) {
                setAddressInfo(address);
                console.log('✅ Endereço atualizado:', address);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar endereço:', error);
            if (error.message.includes('Timeout')) {
                Alert.alert('Timeout', 'A operação demorou muito. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedCoordinate && addressInfo) {
            onAddressSelect({
                ...addressInfo,
                latitude: selectedCoordinate.latitude,
                longitude: selectedCoordinate.longitude,
            });
        } else {
            Alert.alert('Aviso', 'Selecione uma localização no mapa primeiro.');
        }
    };


    if (loadingLocation) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Obtendo sua localização...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Escolher Endereço</Text>
                <TouchableOpacity
                    style={[styles.confirmButton, (!selectedCoordinate || !addressInfo) && styles.confirmButtonDisabled]}
                    onPress={handleConfirm}
                    disabled={!selectedCoordinate || !addressInfo}
                >
                    <Text style={[styles.confirmButtonText, (!selectedCoordinate || !addressInfo) && styles.confirmButtonTextDisabled]}>
                        Confirmar
                    </Text>
                </TouchableOpacity>
            </View>

            <MapView
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                initialRegion={mapRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                loadingEnabled={false}
                onMapReady={() => {
                    console.log('🗺️ Mapa carregado!');
                }}
                mapType="standard"
            >
                {selectedCoordinate && (
                    <Marker
                        coordinate={selectedCoordinate}
                        draggable={true}
                        onDragEnd={handleMarkerDragEnd}
                        pinColor="red"
                    />
                )}
            </MapView>

            <View style={styles.infoContainer}>
                <Text style={styles.instructionText}>
                    Toque no mapa ou arraste o marcador para escolher o endereço
                </Text>

                {loading && (
                    <View style={styles.loadingInfo}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={styles.loadingInfoText}>Obtendo endereço...</Text>
                    </View>
                )}

                {addressInfo && !loading && (
                    <View style={styles.addressContainer}>
                        <Text style={styles.addressTitle}>Endereço Selecionado:</Text>
                        <Text style={styles.addressText}>{addressInfo.formattedAddress}</Text>
                        {addressInfo.address && (
                            <Text style={styles.addressDetail}>Rua: {addressInfo.address}</Text>
                        )}
                        {addressInfo.neighborhood && (
                            <Text style={styles.addressDetail}>Bairro: {addressInfo.neighborhood}</Text>
                        )}
                        {addressInfo.city && (
                            <Text style={styles.addressDetail}>Cidade: {addressInfo.city}</Text>
                        )}
                    </View>
                )}
            </View>

        </View>
    );
};

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
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#f8f9fa',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        paddingTop: Platform.OS === 'ios' ? 50 : 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    cancelButton: {
        padding: 5,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    confirmButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    confirmButtonDisabled: {
        backgroundColor: '#ccc',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButtonTextDisabled: {
        color: '#999',
    },
    map: {
        flex: 1,
    },
    infoContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        maxHeight: 200,
    },
    instructionText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 10,
    },
    loadingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    loadingInfoText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#666',
    },
    addressContainer: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginTop: 10,
    },
    addressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    addressText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    addressDetail: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
    },
});

export default MapaEscolherEndereco;
