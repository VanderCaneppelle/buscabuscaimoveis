import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PROPERTY_TYPES = [
    { value: 'Casa', icon: 'home', color: '#3498db' },
    { value: 'Apartamento', icon: 'business', color: '#9b59b6' },
    { value: 'Terreno', icon: 'map', color: '#27ae60' },
    { value: 'Chácara', icon: 'leaf', color: '#16a085' },
    { value: 'Fazenda', icon: 'trail-sign', color: '#d35400' },
    { value: 'Comercial', icon: 'storefront', color: '#c0392b' },
    { value: 'Galpão', icon: 'cube', color: '#7f8c8d' },
    { value: 'Studio', icon: 'bed', color: '#8e44ad' },
];

export default function Step1PropertyType({ formData, updateFormData }) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Título e Descrição */}
                <View style={styles.header}>
                    <Text style={styles.title}>Que tipo de imóvel você quer anunciar?</Text>
                    <Text style={styles.subtitle}>
                        Escolha a categoria que melhor descreve seu imóvel
                    </Text>
                </View>

                {/* Grid de Tipos */}
                <View style={styles.grid}>
                    {PROPERTY_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.value}
                            style={[
                                styles.typeCard,
                                formData.propertyType === type.value && styles.typeCardSelected,
                            ]}
                            onPress={() => updateFormData('propertyType', type.value)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: type.color + '15' }]}>
                                <Ionicons 
                                    name={type.icon} 
                                    size={36} 
                                    color={formData.propertyType === type.value ? type.color : '#6B7280'} 
                                />
                            </View>
                            <Text style={[
                                styles.typeText,
                                formData.propertyType === type.value && styles.typeTextSelected
                            ]}>
                                {type.value}
                            </Text>
                            {formData.propertyType === type.value && (
                                <View style={styles.checkmarkContainer}>
                                    <Ionicons name="checkmark-circle" size={24} color={type.color} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info Card */}
                {formData.propertyType && (
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color="#3498db" />
                        <Text style={styles.infoText}>
                            Ótimo! Você selecionou <Text style={styles.infoBold}>{formData.propertyType}</Text>. 
                            Clique em continuar para prosseguir.
                        </Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 28,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    typeCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 140,
        justifyContent: 'center',
        position: 'relative',
    },
    typeCardSelected: {
        borderColor: '#ffcc1e',
        backgroundColor: '#fffdf0',
        transform: [{ scale: 1.02 }],
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    typeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
    },
    typeTextSelected: {
        color: '#1F2937',
        fontWeight: '700',
    },
    checkmarkContainer: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#1E40AF',
        marginLeft: 12,
        lineHeight: 20,
    },
    infoBold: {
        fontWeight: '700',
    },
});

