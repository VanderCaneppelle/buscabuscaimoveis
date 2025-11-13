import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { reverseGeocode, testMapboxToken } from '../lib/geocodingService';

const MapaEscolherEndereco = ({ 
    visible = false, 
    onClose, 
    onSelectAddress, 
    initialCoordinates 
}) => {

    const [mapRegion, setMapRegion] = useState({
        latitude: initialCoordinates?.latitude || -27.0903, // Itapema-SC como padrão
        longitude: initialCoordinates?.longitude || -48.6114,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    });
    const [selectedCoordinate, setSelectedCoordinate] = useState(
        initialCoordinates ? {
            latitude: initialCoordinates.latitude,
            longitude: initialCoordinates.longitude
        } : null
    );
    const [addressInfo, setAddressInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [userLocation, setUserLocation] = useState(null);

    // Função para fazer reverse geocode de coordenadas
    const handleReverseGeocode = useCallback(async (latitude, longitude) => {
        console.log('📍 Buscando endereço para coordenadas:', { latitude, longitude });
        
        setLoading(true);
        setAddressInfo(null);

        try {
            // Adicionar timeout para evitar travamento
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: operação demorou muito')), 10000)
            );

            const addressPromise = reverseGeocode(latitude, longitude);
            const address = await Promise.race([addressPromise, timeoutPromise]);

            if (address) {
                setAddressInfo(address);
                console.log('✅ Endereço obtido:', address);
            } else {
                console.warn('⚠️ Não foi possível obter o endereço para estas coordenadas');
            }
        } catch (error) {
            console.error('❌ Erro ao obter endereço:', error);
            if (error.message.includes('Timeout')) {
                console.warn('⚠️ Timeout ao buscar endereço - operação demorou muito');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (visible) {
            requestLocationPermission();
            
            // Se tem coordenadas iniciais, buscar o endereço
            if (initialCoordinates && initialCoordinates.latitude && initialCoordinates.longitude) {
                handleReverseGeocode(initialCoordinates.latitude, initialCoordinates.longitude);
            }
        }
    }, [visible, initialCoordinates, handleReverseGeocode]);

    // Monitorar mudanças no userLocation para debug
    useEffect(() => {
        console.log('📍 userLocation state mudou:', userLocation);
    }, [userLocation]);

    // Monitorar mudanças no mapRegion para debug
    useEffect(() => {
        console.log('📍 mapRegion state mudou:', mapRegion);
    }, [mapRegion]);

    const requestLocationPermission = async () => {
        try {
            // Verificar se já temos permissão
            let { status } = await Location.getForegroundPermissionsAsync();

            if (status !== 'granted') {
                status = (await Location.requestForegroundPermissionsAsync()).status;
            }

            if (status === 'granted') {
                console.log('📍 Permissão concedida, obtendo localização...');
                // Buscar localização em segundo plano sem redirecionar
                Location.getCurrentPositionAsync({
                    accuracy: Platform.OS === 'ios' ? Location.Accuracy.High : Location.Accuracy.Balanced,
                    timeout: 15000,
                    maximumAge: 30000,
                }).then(location => {
                    const { latitude, longitude } = location.coords;
                    const userLoc = { latitude, longitude };
                    setUserLocation(userLoc);
                    console.log('📍 Localização do usuário obtida em segundo plano:', userLoc);
                    console.log('📍 userLocation state atualizado:', userLoc);
                }).catch(error => {
                    console.log('📍 Erro ao obter localização em segundo plano:', error);
                    console.log('📍 Tipo do erro:', error.message);
                });
            } else {
                console.log('📍 Permissão de localização negada, usando localização padrão');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar permissões:', error);
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
            const dataToSend = {
                ...addressInfo,
                coordinates: {
                    latitude: selectedCoordinate.latitude,
                    longitude: selectedCoordinate.longitude,
                },
            };
            console.log('✅ Confirmando seleção:', dataToSend);
            onSelectAddress(dataToSend);
        } else {
            Alert.alert('Aviso', 'Selecione uma localização no mapa primeiro.');
        }
    };




    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#6B7280" />
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
                        <Ionicons 
                            name="checkmark" 
                            size={20} 
                            color={selectedCoordinate && addressInfo ? "#fff" : "#9CA3AF"} 
                        />
                    </TouchableOpacity>
                </View>

            {/* Botão de localização personalizado apenas para iOS */}
            {Platform.OS === 'ios' && (
                <View style={styles.iosLocationButtonContainer}>
                    <TouchableOpacity
                        style={styles.iosLocationButton}
                        onPress={() => {
                            console.log('📍 Botão de localização pressionado');
                            console.log('📍 userLocation disponível:', !!userLocation);
                            console.log('📍 userLocation:', userLocation);

                            if (userLocation) {
                                const newRegion = {
                                    latitude: userLocation.latitude,
                                    longitude: userLocation.longitude,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01,
                                };
                                console.log('📍 Atualizando região do mapa para:', newRegion);
                                setMapRegion(newRegion);
                                setSelectedCoordinate(userLocation);
                                console.log('📍 Coordenada selecionada atualizada para:', userLocation);
                            } else {
                                console.log('📍 Localização não disponível');
                                Alert.alert('Localização não disponível', 'A localização ainda não foi obtida. Aguarde um momento e tente novamente.');
                            }
                        }}
                    >
                        <Ionicons name="locate" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            )}

            <MapView
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                region={mapRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={Platform.OS === 'ios' ? false : true}
                showsCompass={true}
                loadingEnabled={false}
                onMapReady={() => {
                    console.log('🗺️ Mapa carregado!');
                }}
                mapType="standard"
                followsUserLocation={false}
                userLocationAnnotationTitle="Sua localização"
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
        </Modal>
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 6,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    confirmButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
    confirmButtonText: {
        color: '#1F2937',
        fontSize: 16,
        fontWeight: '700',
    },
    confirmButtonTextDisabled: {
        color: '#9CA3AF',
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
        padding: 5,
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
    iosLocationButtonContainer: {
        position: 'absolute',
        top: 120,
        right: 20,
        zIndex: 1000,
    },
    iosLocationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
});

export default MapaEscolherEndereco;
