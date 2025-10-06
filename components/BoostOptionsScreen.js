import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
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
            setBoostPlans(plans);

            // Selecionar plano de 3 dias por padrão (mais popular)
            const defaultPlan = plans.find(p => p.duration_days === 3) || plans[0];
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
        const isPopular = plan.duration_days === 3;

        // Calcular economia comparado ao plano de 1 dia
        const oneDayPlan = boostPlans.find(p => p.duration_days === 1);
        const savings = oneDayPlan ? (oneDayPlan.price * plan.duration_days) - plan.price : 0;
        const savingsPercent = oneDayPlan ? Math.round((savings / (oneDayPlan.price * plan.duration_days)) * 100) : 0;

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
                        <Text style={styles.popularText}>Mais Escolhido</Text>
                    </View>
                )}

                <View style={styles.planHeader}>
                    <View style={styles.radioButton}>
                        {isSelected && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.planDuration}>
                        {plan.duration_days === 1 ? '1 Dia' : `${plan.duration_days} Dias`}
                    </Text>
                </View>

                <View style={styles.planPrice}>
                    <Text style={styles.priceValue}>
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                    </Text>
                    {savings > 0 && (
                        <View style={styles.savingsBadge}>
                            <Text style={styles.savingsText}>
                                Economize {savingsPercent}%
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.planDescription}>{plan.description}</Text>

                {plan.duration_days > 1 && (
                    <Text style={styles.pricePerDay}>
                        R$ {(plan.price / plan.duration_days).toFixed(2).replace('.', ',')}/dia
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Carregando opções...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#00335e" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Impulsionar Anúncio</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Property Info */}
                    <View style={styles.propertyCard}>
                        <Image
                            source={{ uri: property.images?.[0] }}
                            style={styles.propertyImage}
                            resizeMode="cover"
                        />
                        <View style={styles.propertyInfo}>
                            <Text style={styles.propertyTitle} numberOfLines={2}>
                                {property.title}
                            </Text>
                            <Text style={styles.propertyLocation}>
                                {property.city}, {property.state}
                            </Text>
                        </View>
                    </View>

                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="rocket" size={32} color="#f39c12" />
                        <Text style={styles.infoTitle}>Destaque seu Anúncio</Text>
                        <Text style={styles.infoText}>
                            Seu anúncio aparecerá na aba "Destaques" e terá maior visibilidade.
                            Escolha por quantos dias deseja impulsionar:
                        </Text>
                    </View>

                    {/* Boost Plans */}
                    <View style={styles.plansSection}>
                        <Text style={styles.sectionTitle}>Escolha a Duração</Text>
                        {boostPlans.map(renderBoostPlanCard)}
                    </View>

                    {/* Benefits */}
                    <View style={styles.benefitsSection}>
                        <Text style={styles.sectionTitle}>Benefícios do Impulsionamento</Text>
                        <View style={styles.benefitItem}>
                            <Ionicons name="eye" size={20} color="#3498db" />
                            <Text style={styles.benefitText}>
                                Apareça na aba "Destaques" do app
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="trending-up" size={20} color="#2ecc71" />
                            <Text style={styles.benefitText}>
                                Aumente em até 10x a visibilidade
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="time" size={20} color="#f39c12" />
                            <Text style={styles.benefitText}>
                                Venda mais rápido seu imóvel
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="star" size={20} color="#e74c3c" />
                            <Text style={styles.benefitText}>
                                Destaque entre milhares de anúncios
                            </Text>
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
                        <Text style={styles.continueButtonText}>
                            Continuar para Pagamento
                        </Text>
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
    headerContainer: {
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        padding: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
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
        marginBottom: 12,
        borderRadius: 12,
        padding: 16,
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
        top: -10,
        right: 20,
        backgroundColor: '#f39c12',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3498db',
    },
    planDuration: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    planPrice: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    priceValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3498db',
        marginRight: 10,
    },
    savingsBadge: {
        backgroundColor: '#2ecc71',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    savingsText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    planDescription: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 6,
    },
    pricePerDay: {
        fontSize: 12,
        color: '#95a5a6',
        fontStyle: 'italic',
    },
    benefitsSection: {
        marginBottom: 20,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    benefitText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
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

