import React, { useState, useEffect, useCallback } from 'react';
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
import Slider from '@react-native-community/slider';
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
    const [priceRange, setPriceRange] = useState({
        min: 0,
        max: 5000000,
    });
    const [sliderValues, setSliderValues] = useState({
        min: filters.minPrice ? parseFloat(filters.minPrice) || 0 : 0,
        max: filters.maxPrice ? parseFloat(filters.maxPrice) || 5000000 : 5000000,
    });
    const [minSliderValue, setMinSliderValue] = useState(
        filters.minPrice ? parseFloat(filters.minPrice) || 0 : 0
    );
    const [maxSliderValue, setMaxSliderValue] = useState(
        filters.maxPrice ? parseFloat(filters.maxPrice) || 5000000 : 5000000
    );

    // Sincronizar tempFilters quando filters mudar
    useEffect(() => {
        setTempFilters(filters);

        // Converter strings para números com segurança
        const minPrice = filters.minPrice ? parseFloat(filters.minPrice) || 0 : 0;
        const maxPrice = filters.maxPrice ? parseFloat(filters.maxPrice) || 5000000 : 5000000;

        setMinSliderValue(minPrice);
        setMaxSliderValue(maxPrice);
        setSliderValues({
            min: minPrice,
            max: maxPrice,
        });
    }, [filters]);

    const formatPrice = useCallback((value) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}K`;
        }
        return value.toString();
    }, []);

    const handleMinSliderChange = useCallback((value) => {
        // Garantir que o preço mínimo não seja maior que o máximo
        const maxValue = Math.max(value + 100000, maxSliderValue);
        setMinSliderValue(value);
        setMaxSliderValue(maxValue);
        setSliderValues(prev => ({ min: value, max: maxValue }));

        // Atualizar filtros temporários
        setTempFilters(prev => ({
            ...prev,
            minPrice: value > 0 ? value.toString() : '',
            maxPrice: maxValue < 5000000 ? maxValue.toString() : '',
        }));
    }, [maxSliderValue]);

    const handleMaxSliderChange = useCallback((value) => {
        // Garantir que o preço máximo não seja menor que o mínimo
        const minValue = Math.min(value - 100000, minSliderValue);
        setMaxSliderValue(value);
        setMinSliderValue(minValue);
        setSliderValues(prev => ({ min: minValue, max: value }));

        // Atualizar filtros temporários
        setTempFilters(prev => ({
            ...prev,
            minPrice: minValue > 0 ? minValue.toString() : '',
            maxPrice: value < 5000000 ? value.toString() : '',
        }));
    }, [minSliderValue]);

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
        setMinSliderValue(0);
        setMaxSliderValue(5000000);
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

                            {/* Range de Preço com Slider */}
                            <View style={styles.filterGroup}>
                                <Text style={styles.filterLabel}>Faixa de Preço</Text>

                                {/* Valores de preço acima dos sliders */}
                                <View style={styles.priceDisplayContainer}>
                                    <Text style={styles.priceDisplayText}>
                                        R$ {formatPrice(sliderValues.min)}
                                    </Text>
                                    <Text style={styles.priceDisplayText}>
                                        R$ {formatPrice(sliderValues.max)}
                                    </Text>
                                </View>

                                {/* Sliders ocupando toda a largura */}
                                <View style={styles.sliderContainer}>
                                    <Text style={styles.sliderLabel}>Preço Mínimo</Text>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={priceRange.min}
                                        maximumValue={priceRange.max}
                                        value={minSliderValue}
                                        onValueChange={handleMinSliderChange}
                                        minimumTrackTintColor="#00335e"
                                        maximumTrackTintColor="#e2e8f0"
                                        thumbStyle={styles.sliderThumb}
                                        step={10000}
                                    />

                                    <Text style={styles.sliderLabel}>Preço Máximo</Text>
                                    <Slider
                                        style={styles.slider}
                                        minimumValue={priceRange.min}
                                        maximumValue={priceRange.max}
                                        value={maxSliderValue}
                                        onValueChange={handleMaxSliderChange}
                                        minimumTrackTintColor="#00335e"
                                        maximumTrackTintColor="#e2e8f0"
                                        thumbStyle={styles.sliderThumb}
                                        step={10000}
                                    />
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
