import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './FiltersModal.styles';

export default function FiltersModal({
    visible,
    onClose,
    filters,
    onApplyFilters,
    cities = [],
}) {
    const insets = useSafeAreaInsets();
    const [tempFilters, setTempFilters] = useState(filters);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [sliderValues, setSliderValues] = useState({
        min: filters.minPrice || 0,
        max: filters.maxPrice || 5000000,
    });

    // Sincronizar tempFilters quando filters mudar
    useEffect(() => {
        setTempFilters(filters);
    }, [filters]);

    const selectCity = (city) => {
        setTempFilters(prev => ({ ...prev, city }));
        setShowCityDropdown(false);
    };

    const togglePropertyType = (type) => {
        setTempFilters(prev => ({
            ...prev,
            propertyType: prev.propertyType.includes(type)
                ? prev.propertyType.filter(t => t !== type)
                : [...prev.propertyType, type]
        }));
    };

    const clearFilters = () => {
        const clearedFilters = {
            city: '',
            propertyType: [],
            minPrice: '',
            maxPrice: '',
        };
        setTempFilters(clearedFilters);
        setSliderValues({ min: 0, max: 5000000 });
        setShowCityDropdown(false);
    };

    const applyFilters = () => {
        onApplyFilters(tempFilters);
        onClose();
    };

    const propertyTypes = ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Rural'];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay} pointerEvents="box-none">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContent}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filtros</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#00335e" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <ScrollView
                            style={styles.filtersScrollView}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled={true}
                            removeClippedSubviews={false}
                        >
                            {/* Tipo de Propriedade */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Tipo de Propriedade</Text>
                                <View style={styles.propertyTypeContainer}>
                                    {propertyTypes.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.propertyTypeButton,
                                                tempFilters.propertyType.includes(type) && styles.propertyTypeButtonSelected
                                            ]}
                                            onPress={() => togglePropertyType(type)}
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
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Cidade</Text>
                                <TouchableOpacity
                                    style={styles.dropdownButton}
                                    onPress={() => setShowCityDropdown(!showCityDropdown)}
                                >
                                    <Text style={styles.dropdownButtonText}>
                                        {tempFilters.city || 'Selecione a cidade'}
                                    </Text>
                                    <Ionicons
                                        name={showCityDropdown ? "chevron-up" : "chevron-down"}
                                        size={24}
                                        color="#00335e"
                                    />
                                </TouchableOpacity>
                                {showCityDropdown && (
                                    <View style={styles.dropdownList}>
                                        <ScrollView
                                            style={styles.dropdownScroll}
                                            showsVerticalScrollIndicator={true}
                                            indicatorStyle="black"
                                            nestedScrollEnabled={true}
                                        >
                                            <TouchableOpacity
                                                style={styles.dropdownItem}
                                                onPress={() => selectCity('')}
                                            >
                                                <Text style={styles.dropdownItemText}>Todas as cidades</Text>
                                            </TouchableOpacity>
                                            {cities.map((city, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.dropdownItem}
                                                    onPress={() => selectCity(city)}
                                                >
                                                    <Text style={styles.dropdownItemText}>{city}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Range de Preço */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Faixa de Preço</Text>
                                <View style={styles.priceRangeContainer}>
                                    <Text style={styles.priceRangeText}>
                                        R$ {sliderValues.min.toLocaleString()} - R$ {sliderValues.max.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>

                    <View style={[styles.filterButtons, { paddingBottom: insets.bottom + 20 }]}>
                        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                            <Text style={styles.clearButtonText}>Limpar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                            <Text style={styles.applyButtonText}>Aplicar</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}
