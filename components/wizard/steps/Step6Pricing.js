import React, { useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatCurrency = (value) => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    if (!numbers) return '';
    
    // Converte para número e formata
    const num = parseInt(numbers) / 100;
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const parseCurrency = (formattedValue) => {
    // Remove formatação e retorna apenas números
    return formattedValue.replace(/\D/g, '');
};

export default function Step5Pricing({ formData, updateFormData }) {
    const priceInputRef = useRef(null);
    const salePriceInputRef = useRef(null);

    const handlePriceChange = (value) => {
        const formatted = formatCurrency(value);
        updateFormData('price', formatted);
    };

    const handleSalePriceChange = (value) => {
        const formatted = formatCurrency(value);
        updateFormData('salePrice', formatted);
    };

    const priceValue = formData.price ? parseFloat(parseCurrency(formData.price)) / 100 : 0;
    const salePriceValue = formData.salePrice ? parseFloat(parseCurrency(formData.salePrice)) / 100 : 0;
    const hasDiscount = salePriceValue > 0 && salePriceValue < priceValue;
    const discountPercent = hasDiscount 
        ? Math.round(((priceValue - salePriceValue) / priceValue) * 100)
        : 0;

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 180 : 20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                <Text style={styles.title}>Qual o valor do imóvel?</Text>
                <Text style={styles.subtitle}>
                    {formData.transactionType === 'Aluguel' 
                        ? 'Informe o valor do aluguel mensal'
                        : 'Defina o preço de venda do imóvel'
                    }
                </Text>

                {/* Preço Principal */}
                <View style={styles.priceSection}>
                    <View style={styles.priceLabelContainer}>
                        <View style={styles.priceIconContainer}>
                            <Ionicons name="cash" size={24} color="#10B981" />
                        </View>
                        <View style={styles.priceLabelContent}>
                            <Text style={styles.priceLabel}>
                                {formData.transactionType === 'Aluguel' ? 'Valor do Aluguel' : 'Preço de Venda'}
                            </Text>
                            <Text style={styles.required}>*</Text>
                        </View>
                    </View>
                    <View style={styles.priceInputContainer}>
                        <Text style={styles.currencySymbol}>R$</Text>
                        <TextInput
                            ref={priceInputRef}
                            style={styles.priceInput}
                            value={formData.price}
                            onChangeText={handlePriceChange}
                            placeholder="0,00"
                            placeholderTextColor="#D1D5DB"
                            keyboardType="numeric"
                            returnKeyType="next"
                            onSubmitEditing={() => salePriceInputRef.current?.focus()}
                            blurOnSubmit={false}
                        />
                    </View>
                    <Text style={styles.hint}>
                        Pesquise preços de imóveis similares na região para definir um valor competitivo
                    </Text>
                </View>

                {/* Preço Promocional */}
                <View style={styles.salePriceSection}>
                    <View style={styles.priceLabelContainer}>
                        <View style={[styles.priceIconContainer, styles.saleIconContainer]}>
                            <Ionicons name="pricetag" size={24} color="#F59E0B" />
                        </View>
                        <View style={styles.priceLabelContent}>
                            <Text style={styles.priceLabel}>Preço Promocional</Text>
                            <Text style={styles.optional}>(opcional)</Text>
                        </View>
                    </View>
                    <View style={[
                        styles.priceInputContainer,
                        hasDiscount && styles.priceInputContainerPromo
                    ]}>
                        <Text style={styles.currencySymbol}>R$</Text>
                        <TextInput
                            ref={salePriceInputRef}
                            style={styles.priceInput}
                            value={formData.salePrice}
                            onChangeText={handleSalePriceChange}
                            placeholder="0,00"
                            placeholderTextColor="#D1D5DB"
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            blurOnSubmit={true}
                        />
                    </View>
                    
                    {hasDiscount && (
                        <View style={styles.discountBadge}>
                            <Ionicons name="trending-down" size={16} color="#10B981" />
                            <Text style={styles.discountText}>
                                {discountPercent}% de desconto
                            </Text>
                        </View>
                    )}

                    <Text style={styles.hint}>
                        Use para destacar promoções ou negociações especiais
                    </Text>
                </View>

                {/* Comparação de Preços */}
                {hasDiscount && (
                    <View style={styles.comparisonCard}>
                        <View style={styles.comparisonRow}>
                            <Text style={styles.comparisonLabel}>Preço original:</Text>
                            <Text style={styles.comparisonValueStrike}>
                                R$ {formData.price}
                            </Text>
                        </View>
                        <View style={[styles.comparisonRow, styles.comparisonRowHighlight]}>
                            <Text style={styles.comparisonLabelPromo}>Preço promocional:</Text>
                            <Text style={styles.comparisonValuePromo}>
                                R$ {formData.salePrice}
                            </Text>
                        </View>
                        <View style={styles.savingsRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                            <Text style={styles.savingsText}>
                                Economia de R$ {formatCurrency((priceValue - salePriceValue).toString() + '00')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="bulb" size={20} color="#F59E0B" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>💡 Dica de especialista</Text>
                        <Text style={styles.infoText}>
                            Preços competitivos e promocionais atraem mais visualizações. 
                            Imóveis com desconto recebem até 3x mais contatos!
                        </Text>
                    </View>
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
        marginBottom: 28,
        lineHeight: 22,
    },
    priceSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    salePriceSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    priceLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    priceIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#10B98115',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    saleIconContainer: {
        backgroundColor: '#F59E0B15',
    },
    priceLabelContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    priceLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
    },
    required: {
        fontSize: 17,
        fontWeight: '700',
        color: '#EF4444',
        marginLeft: 4,
    },
    optional: {
        fontSize: 13,
        color: '#9CA3AF',
        marginLeft: 6,
        fontWeight: '500',
    },
    priceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    priceInputContainerPromo: {
        borderColor: '#FCD34D',
        backgroundColor: '#FFFBEB',
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '700',
        color: '#6B7280',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
        fontSize: 36,
        fontWeight: '700',
        color: '#1F2937',
        paddingVertical: 20,
    },
    hint: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    discountText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#047857',
        marginLeft: 6,
    },
    comparisonCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    comparisonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    comparisonRowHighlight: {
        backgroundColor: '#FEF3C7',
        marginHorizontal: -8,
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    comparisonLabel: {
        fontSize: 14,
        color: '#92400E',
    },
    comparisonLabelPromo: {
        fontSize: 15,
        fontWeight: '600',
        color: '#92400E',
    },
    comparisonValueStrike: {
        fontSize: 16,
        color: '#92400E',
        textDecorationLine: 'line-through',
    },
    comparisonValuePromo: {
        fontSize: 18,
        fontWeight: '700',
        color: '#B45309',
    },
    savingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#FDE68A',
    },
    savingsText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#047857',
        marginLeft: 6,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: '#FFF7ED',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FED7AA',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
});

