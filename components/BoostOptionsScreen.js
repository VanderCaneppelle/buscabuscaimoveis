import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BoostService } from '../lib/boostService';
import { useAuth } from '../contexts/AuthContext';
import StandardHeader from './StandardHeader';
import AppText from './AppText';

export default function BoostOptionsScreen({ navigation, route }) {
    console.log('Rendered BoostOptionsScreen');

    const { property } = route.params;
    const { user } = useAuth();
    const [boostPlans, setBoostPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBoostPlans();
    }, []);

    const loadBoostPlans = async () => {
        try {
            setLoading(true);
            const plans = await BoostService.getBoostPlans();
            console.log('📊 Planos carregados:', plans);
            setBoostPlans(plans);

            // Selecionar plano de 5 dias por padrão (mais popular)
            const defaultPlan = plans.find(p => p.duration_days === 5) || plans.find(p => p.duration_days === 3) || plans[0];
            setSelectedPlan(defaultPlan);
        } catch (error) {
            console.error('Erro ao carregar planos de boost:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (!selectedPlan) return;

        navigation.navigate('BoostPayment', {
            property,
            boostPlan: selectedPlan
        });
    };

    const renderBoostPlanCard = (plan) => {
        const isSelected = selectedPlan?.id === plan.id;
        const isPopular = plan.duration_days === 5; // Plano de 5 dias é o mais popular

        // Calcular economia comparado ao plano de 1 dia
        const oneDayPlan = boostPlans.find(p => p.duration_days === 1);

        // Preço sem desconto = preço de 1 dia × quantidade de dias
        const priceWithoutDiscount = oneDayPlan ? oneDayPlan.price * plan.duration_days : 0;
        // Economia = preço sem desconto - preço atual do plano
        const savings = priceWithoutDiscount - plan.price;
        // Percentual de desconto
        const savingsPercent = priceWithoutDiscount > 0 ? Math.round((savings / priceWithoutDiscount) * 100) : 0;

        console.log(`💰 Plano ${plan.duration_days} dias:`, {
            oneDayPrice: oneDayPlan?.price,
            planPrice: plan.price,
            priceWithoutDiscount,
            savings,
            savingsPercent
        });

        return (
            <TouchableOpacity
                key={plan.id}
                style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    isPopular && styles.planCardPopular
                ]}
                onPress={() => setSelectedPlan(plan)}
            >
                {isPopular && (
                    <View style={styles.popularBadge}>
                        <AppText style={styles.popularText}>Mais Escolhido</AppText>
                    </View>
                )}

                <View style={styles.planHeader}>
                    <View style={styles.radioButton}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    <AppText style={styles.planDuration}>
                        {plan.duration_days === 1 ? '1 Dia' : `${plan.duration_days} Dias`}
                    </AppText>
                </View>

                <View style={styles.planPrice}>
                    <AppText style={styles.priceValue}>
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                    </AppText>
                </View>

                <View style={styles.planFooter}>
                    {plan.duration_days > 1 && (
                        <AppText style={styles.pricePerDay}>
                            R$ {(plan.price / plan.duration_days).toFixed(2).replace('.', ',')}/dia
                        </AppText>
                    )}
                    {plan.duration_days > 1 && savingsPercent > 0 && (
                        <View style={styles.savingsBadge}>
                            <Ionicons name="trending-down" size={12} color="#fff" />
                            <AppText style={styles.savingsText}>
                                -{savingsPercent}%
                            </AppText>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <AppText style={styles.loadingText}>Carregando opções...</AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <StandardHeader
                title="Impulsionar Anúncios"
                subtitle="Impulse seus anúncios"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Boost Plans */}
                    <View style={styles.plansSection}>
                        <AppText style={styles.sectionTitle}>Escolha a Duração</AppText>
                        {boostPlans.map(renderBoostPlanCard)}
                    </View>

                    {/* Benefits */}
                    <View style={styles.benefitsSection}>
                        <AppText style={styles.sectionTitle}>Benefícios do Impulsionamento</AppText>
                        <View style={styles.benefitItem}>
                            <Ionicons name="eye" size={20} color="#3498db" />
                            <AppText style={styles.benefitText}>
                                Apareça na aba "Destaques" do app
                            </AppText>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="trending-up" size={20} color="#2ecc71" />
                            <AppText style={styles.benefitText}>
                                Aumente em até 10x a visibilidade
                            </AppText>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="time" size={20} color="#f39c12" />
                            <AppText style={styles.benefitText}>
                                Venda mais rápido seu imóvel
                            </AppText>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="star" size={20} color="#e74c3c" />
                            <AppText style={styles.benefitText}>
                                Destaque entre milhares de anúncios
                            </AppText>
                        </View>
                    </View>

                </ScrollView>

                {/* Continue Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.continueButton, !selectedPlan && styles.continueButtonDisabled]}
                        onPress={handleContinue}
                        disabled={!selectedPlan}
                    >
                        <AppText style={styles.continueButtonText}>
                            Continuar para Pagamento
                        </AppText>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },

    placeholder: {
        width: 40,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        paddingTop: 20,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#7f8c8d',
    },
    propertyCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    propertyImage: {
        width: '100%',
        height: 150,
        backgroundColor: '#f8f9fa',
    },
    propertyInfo: {
        padding: 15,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 5,
    },
    propertyLocation: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    infoCard: {
        backgroundColor: '#fff8e1',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 10,
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 20,
    },
    plansSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    planCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    planCardSelected: {
        borderColor: '#3498db',
        backgroundColor: '#e8f4fd',
    },
    planCardPopular: {
        borderColor: '#f39c12',
    },
    popularBadge: {
        position: 'absolute',
        top: -8,
        right: 20,
        backgroundColor: '#f39c12',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    popularText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    radioButtonInner: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: '#3498db',
    },
    planDuration: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    planPrice: {
        marginBottom: 8,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3498db',
    },
    planFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pricePerDay: {
        fontSize: 11,
        color: '#95a5a6',
        fontStyle: 'italic',
    },
    savingsBadge: {
        backgroundColor: '#27ae60',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    savingsText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    benefitsSection: {
        marginBottom: 15,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    benefitText: {
        fontSize: 13,
        color: '#2c3e50',
        marginLeft: 10,
        flex: 1,
        lineHeight: 18,
    },
    footer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    continueButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    continueButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
});

