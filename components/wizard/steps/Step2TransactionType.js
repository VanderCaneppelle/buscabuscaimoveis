import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../AppText';

const TRANSACTION_TYPES = [
    { 
        value: 'Venda', 
        icon: 'cash', 
        color: '#10B981', 
        description: 'Anunciar imóvel para venda',
        benefits: 'Atinja compradores interessados em adquirir'
    },
    { 
        value: 'Aluguel', 
        icon: 'key', 
        color: '#3498db', 
        description: 'Anunciar imóvel para locação',
        benefits: 'Encontre inquilinos de forma rápida e segura'
    },
];

export default function Step2TransactionType({ formData, updateFormData }) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Título e Descrição */}
                <View style={styles.header}>
                    <AppText style={styles.title}>O imóvel é para venda ou aluguel?</AppText>
                    <AppText style={styles.subtitle}>
                        Defina como você quer disponibilizar seu {formData.propertyType || 'imóvel'}
                    </AppText>
                </View>

                {/* Cards de Transação */}
                <View style={styles.transactionContainer}>
                    {TRANSACTION_TYPES.map((transaction) => (
                        <TouchableOpacity
                            key={transaction.value}
                            style={[
                                styles.transactionCard,
                                formData.transactionType === transaction.value && styles.transactionCardSelected,
                            ]}
                            onPress={() => updateFormData('transactionType', transaction.value)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.transactionIconContainer,
                                { backgroundColor: transaction.color + '15' }
                            ]}>
                                <Ionicons 
                                    name={transaction.icon} 
                                    size={40} 
                                    color={formData.transactionType === transaction.value ? transaction.color : '#6B7280'} 
                                />
                            </View>
                            <View style={styles.transactionContent}>
                                <AppText style={[
                                    styles.transactionTitle,
                                    formData.transactionType === transaction.value && styles.transactionTitleSelected
                                ]}>
                                    {transaction.value}
                                </AppText>
                                <AppText style={styles.transactionDescription}>
                                    {transaction.description}
                                </AppText>
                                <AppText style={styles.transactionBenefits}>
                                    {transaction.benefits}
                                </AppText>
                            </View>
                            {formData.transactionType === transaction.value && (
                                <Ionicons name="checkmark-circle" size={28} color={transaction.color} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info Card */}
                {formData.transactionType && (
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color="#3498db" />
                        <AppText style={styles.infoText}>
                            Perfeito! Seu imóvel <AppText style={styles.infoBold}>{formData.propertyType}</AppText> será 
                            anunciado para <AppText style={styles.infoBold}>{formData.transactionType}</AppText>.
                        </AppText>
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
    transactionContainer: {
        gap: 16,
        marginBottom: 20,
    },
    transactionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 120,
    },
    transactionCardSelected: {
        borderColor: '#ffcc1e',
        backgroundColor: '#fffdf0',
        transform: [{ scale: 1.01 }],
    },
    transactionIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    transactionContent: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: 6,
    },
    transactionTitleSelected: {
        color: '#1F2937',
    },
    transactionDescription: {
        fontSize: 15,
        color: '#6B7280',
        marginBottom: 4,
        lineHeight: 20,
    },
    transactionBenefits: {
        fontSize: 13,
        color: '#9CA3AF',
        lineHeight: 18,
        fontStyle: 'italic',
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

