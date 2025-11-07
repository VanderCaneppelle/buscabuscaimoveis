import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CounterButton = ({ label, value, onChange, icon, color, unit }) => {
    const numValue = parseInt(value) || 0;

    const increment = () => {
        if (numValue < 20) {
            onChange((numValue + 1).toString());
        }
    };

    const decrement = () => {
        if (numValue > 0) {
            onChange((numValue - 1).toString());
        }
    };

    return (
        <View style={styles.counterContainer}>
            <View style={styles.counterHeader}>
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Ionicons name={icon} size={24} color={color} />
                </View>
                <Text style={styles.counterLabel}>{label}</Text>
            </View>
            <View style={styles.counterControls}>
                <TouchableOpacity
                    style={[
                        styles.counterButton,
                        styles.decrementButton,
                        numValue === 0 && styles.counterButtonDisabled
                    ]}
                    onPress={decrement}
                    disabled={numValue === 0}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="remove" 
                        size={24} 
                        color={numValue === 0 ? '#D1D5DB' : '#fff'} 
                    />
                </TouchableOpacity>
                <View style={styles.counterValue}>
                    <Text style={styles.counterValueText}>{numValue}</Text>
                    {unit && <Text style={styles.counterUnit}>{unit}</Text>}
                </View>
                <TouchableOpacity
                    style={[
                        styles.counterButton,
                        styles.incrementButton,
                        numValue >= 20 && styles.counterButtonDisabled
                    ]}
                    onPress={increment}
                    disabled={numValue >= 20}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="add" 
                        size={24} 
                        color={numValue >= 20 ? '#D1D5DB' : '#fff'} 
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function Step4Characteristics({ formData, updateFormData }) {
    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                <Text style={styles.title}>Características do imóvel</Text>
                <Text style={styles.subtitle}>
                    Informe os detalhes que tornam seu imóvel único
                </Text>

                {/* Counters */}
                <View style={styles.countersContainer}>
                    <CounterButton
                        label="Quartos"
                        value={formData.bedrooms}
                        onChange={(value) => updateFormData('bedrooms', value)}
                        icon="bed"
                        color="#3498db"
                    />

                    <CounterButton
                        label="Banheiros"
                        value={formData.bathrooms}
                        onChange={(value) => updateFormData('bathrooms', value)}
                        icon="water"
                        color="#9b59b6"
                    />

                    <CounterButton
                        label="Vagas de Garagem"
                        value={formData.parkingSpaces}
                        onChange={(value) => updateFormData('parkingSpaces', value)}
                        icon="car"
                        color="#e74c3c"
                    />
                </View>

                {/* Área */}
                <View style={styles.areaSection}>
                    <View style={styles.areaSectionHeader}>
                        <View style={styles.areaIconContainer}>
                            <Ionicons name="resize" size={24} color="#f39c12" />
                        </View>
                        <Text style={styles.areaSectionTitle}>Área Total</Text>
                        <Text style={styles.optional}>(opcional)</Text>
                    </View>
                    <Text style={styles.areaHint}>
                        Informe a área total do imóvel em metros quadrados
                    </Text>
                    <View style={styles.areaInputContainer}>
                        <TextInput
                            style={styles.areaInput}
                            value={formData.area}
                            onChangeText={(value) => {
                                // Apenas números e ponto
                                const cleaned = value.replace(/[^0-9.]/g, '');
                                updateFormData('area', cleaned);
                            }}
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="decimal-pad"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />
                        <View style={styles.areaUnitContainer}>
                            <Text style={styles.areaUnit}>m²</Text>
                        </View>
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={20} color="#3498db" />
                    <Text style={styles.infoText}>
                        Preencha todos os campos com precisão. Isso ajuda os interessados a encontrarem exatamente o que procuram.
                    </Text>
                </View>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 120,
    },
    content: {
        padding: 20,
        paddingBottom: 0,
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
        marginBottom: 20,
        lineHeight: 22,
    },
    countersContainer: {
        gap: 12,
    },
    counterContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    counterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    counterLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    counterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    counterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    decrementButton: {
        backgroundColor: '#EF4444',
    },
    incrementButton: {
        backgroundColor: '#10B981',
    },
    counterButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    counterValue: {
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        flexDirection: 'row',
    },
    counterValueText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1F2937',
    },
    counterUnit: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 4,
    },
    areaSection: {
        marginTop: 16,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    areaSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    areaIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f39c1215',
        marginRight: 12,
    },
    areaSectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        flex: 1,
    },
    optional: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    areaHint: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 18,
    },
    areaInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 20,
    },
    areaInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: '700',
        color: '#1F2937',
        paddingVertical: 16,
        textAlign: 'center',
    },
    areaUnitContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    areaUnit: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#1E40AF',
        marginLeft: 12,
        lineHeight: 18,
    },
});

