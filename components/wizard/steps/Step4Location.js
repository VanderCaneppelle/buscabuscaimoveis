import React, { useState, useRef } from 'react';
import { 
    View, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapaEscolherEndereco from '../../MapaEscolherEndereco';
import { searchAddresses } from '../../../lib/geocodingService';
import AppText from '../../AppText';
import AppTextInput from '../../AppTextInput';

export default function Step3Location({ formData, updateFormData }) {
    const [addressQuery, setAddressQuery] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const searchTimeout = useRef(null);

    const selectedAddress = formData.address;

    const handleAddressSearch = async (query) => {
        setAddressQuery(query);

        if (query.length < 3) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Debounce search
        searchTimeout.current = setTimeout(async () => {
            try {
                setSearching(true);
                const suggestions = await searchAddresses(query, { limit: 5 });
                setAddressSuggestions(suggestions);
                setShowSuggestions(suggestions.length > 0);
            } catch (error) {
                console.error('Erro ao buscar endereços:', error);
            } finally {
                setSearching(false);
            }
        }, 500);
    };

    const handleAddressSelect = (suggestion) => {
        console.log('📍 Selecionando endereço do dropdown:', suggestion);
        console.log('🔍 Coordenadas recebidas:', suggestion.coordinates);
        
        // Garantir que coordenadas são números
        const latitude = suggestion.coordinates?.latitude 
            ? parseFloat(suggestion.coordinates.latitude) 
            : null;
        const longitude = suggestion.coordinates?.longitude 
            ? parseFloat(suggestion.coordinates.longitude) 
            : null;
        
        console.log('🔢 Coordenadas convertidas:', { latitude, longitude });
        
        const addressData = {
            address: suggestion.address || '',
            neighborhood: suggestion.neighborhood || '',
            city: suggestion.city || '',
            state: suggestion.state || '',
            zipCode: suggestion.zipCode || '',
            latitude: latitude,
            longitude: longitude,
            formattedAddress: suggestion.formattedAddress || '',
        };

        console.log('💾 Salvando dados no formData:', addressData);

        // Update all address fields at once
        Object.keys(addressData).forEach(key => {
            updateFormData(key, addressData[key]);
        });

        setAddressQuery(suggestion.formattedAddress);
        setShowSuggestions(false);
        Keyboard.dismiss();
    };

    const handleMapSelect = (mapData) => {
        console.log('🗺️ Selecionando endereço do mapa:', mapData);
        console.log('🔍 Coordenadas do mapa recebidas:', mapData.coordinates);
        
        // Garantir que coordenadas são números
        const latitude = mapData.coordinates?.latitude 
            ? parseFloat(mapData.coordinates.latitude) 
            : null;
        const longitude = mapData.coordinates?.longitude 
            ? parseFloat(mapData.coordinates.longitude) 
            : null;
        
        console.log('🔢 Coordenadas do mapa convertidas:', { latitude, longitude });
        
        const addressData = {
            address: mapData.address || '',
            neighborhood: mapData.neighborhood || '',
            city: mapData.city || '',
            state: mapData.state || '',
            zipCode: mapData.zipCode || '',
            latitude: latitude,
            longitude: longitude,
            formattedAddress: mapData.formattedAddress || '',
        };

        console.log('💾 Salvando dados do mapa no formData:', addressData);

        Object.keys(addressData).forEach(key => {
            updateFormData(key, addressData[key]);
        });

        setAddressQuery(mapData.formattedAddress);
        setShowMapPicker(false);
    };

    const clearAddress = () => {
        setAddressQuery('');
        updateFormData('address', '');
        updateFormData('neighborhood', '');
        updateFormData('city', '');
        updateFormData('state', '');
        updateFormData('zipCode', '');
        updateFormData('latitude', null);
        updateFormData('longitude', null);
        updateFormData('formattedAddress', '');
    };

    const hasSelectedAddress = selectedAddress && formData.city;

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Header */}
                    <AppText style={styles.title}>Onde fica o imóvel?</AppText>
                    <AppText style={styles.subtitle}>
                        Digite o endereço ou escolha no mapa
                    </AppText>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Ionicons 
                            name="search" 
                            size={20} 
                            color="#6B7280" 
                            style={styles.searchIcon} 
                        />
                        <AppTextInput
                            style={styles.searchInput}
                            value={addressQuery}
                            onChangeText={handleAddressSearch}
                            placeholder="Digite o endereço (Rua, número, bairro, cidade...)"
                            placeholderTextColor="#9CA3AF"
                        />
                        {searching && <ActivityIndicator size="small" color="#ffcc1e" style={styles.loader} />}
                        {addressQuery.length > 0 && !searching && (
                            <TouchableOpacity onPress={clearAddress} style={styles.clearButton}>
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Suggestions List */}
                    {showSuggestions && addressSuggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <FlatList
                                data={addressSuggestions}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleAddressSelect(item)}
                                    >
                                        <Ionicons name="location" size={20} color="#3498db" />
                                        <View style={styles.suggestionTextContainer}>
                                            <AppText style={styles.suggestionAddress}>{item.address}</AppText>
                                            <AppText style={styles.suggestionLocation}>
                                                {item.neighborhood ? `${item.neighborhood}, ` : ''}
                                                {item.city}, {item.state}
                                            </AppText>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                scrollEnabled={false}
                            />
                        </View>
                    )}

                    {/* Map Button */}
                    <TouchableOpacity 
                        style={styles.mapButton}
                        onPress={() => setShowMapPicker(true)}
                    >
                        <Ionicons name="map" size={20} color="#3498db" />
                        <AppText style={styles.mapButtonText}>Escolher no mapa</AppText>
                    </TouchableOpacity>

                    {/* Selected Address Display */}
                    {hasSelectedAddress && (
                        <View style={styles.selectedAddressContainer}>
                            <View style={styles.selectedAddressHeader}>
                                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                <AppText style={styles.selectedAddressTitle}>Endereço selecionado</AppText>
                            </View>
                            <View style={styles.selectedAddressContent}>
                                <AppText style={styles.selectedAddressText}>{formData.address}</AppText>
                                {formData.neighborhood && (
                                    <AppText style={styles.selectedAddressText}>{formData.neighborhood}</AppText>
                                )}
                                <AppText style={styles.selectedAddressText}>
                                    {formData.city}, {formData.state}
                                </AppText>
                                {formData.zipCode && (
                                    <AppText style={styles.selectedAddressText}>CEP: {formData.zipCode}</AppText>
                                )}
                                {formData.latitude && formData.longitude && (
                                    <View style={styles.coordinatesContainer}>
                                        <Ionicons name="location" size={14} color="#047857" style={styles.coordIcon} />
                                        <AppText style={styles.coordinatesText}>
                                            Coordenadas: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                                        </AppText>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity 
                                style={styles.editButton}
                                onPress={clearAddress}
                            >
                                <Ionicons name="create-outline" size={16} color="#3498db" />
                                <AppText style={styles.editButtonText}>Alterar endereço</AppText>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Full Map Modal */}
            {showMapPicker && (
                <MapaEscolherEndereco
                    visible={showMapPicker}
                    onClose={() => setShowMapPicker(false)}
                    onSelectAddress={handleMapSelect}
                    initialCoordinates={
                        formData.latitude && formData.longitude
                            ? { latitude: formData.latitude, longitude: formData.longitude }
                            : null
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 24,
        lineHeight: 22,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        paddingVertical: 16,
    },
    loader: {
        marginLeft: 8,
    },
    clearButton: {
        padding: 4,
        marginLeft: 8,
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    suggestionTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    suggestionAddress: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4,
    },
    suggestionLocation: {
        fontSize: 13,
        color: '#6B7280',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 2,
        borderColor: '#3498db',
    },
    mapButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3498db',
        marginLeft: 8,
    },
    selectedAddressContainer: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#D1FAE5',
    },
    selectedAddressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    selectedAddressTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#065F46',
        marginLeft: 8,
    },
    selectedAddressContent: {
        marginBottom: 12,
    },
    selectedAddressText: {
        fontSize: 14,
        color: '#047857',
        marginBottom: 4,
        lineHeight: 20,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3498db',
        marginLeft: 6,
    },
    coordinatesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#D1FAE5',
    },
    coordIcon: {
        marginRight: 6,
    },
    coordinatesText: {
        fontSize: 12,
        color: '#047857',
        fontFamily: 'monospace',
    },
});

