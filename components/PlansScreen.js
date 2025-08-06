import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PlanService } from '../lib/planService';
import { useAuth } from '../contexts/AuthContext';

export default function PlansScreen({ navigation, route }) {
    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [userPlan, setUserPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        loadPlansAndUserInfo();
    }, []);

    const loadPlansAndUserInfo = async () => {
        try {
            setLoading(true);
            const [plansData, userPlanInfo] = await Promise.all([
                PlanService.getAvailablePlans(),
                PlanService.getUserPlanInfo(user.id)
            ]);

            setPlans(plansData);
            setUserPlan(userPlanInfo);
        } catch (error) {
            console.error('Erro ao carregar planos:', error);
            Alert.alert('Erro', 'Não foi possível carregar os planos');
        } finally {
            setLoading(false);
        }
    };

    const handlePlanSelection = (plan) => {
        // Não permitir selecionar plano gratuito se já tem
        if (plan.name === 'free' && userPlan?.plan?.plan_name === 'free') {
            Alert.alert('Plano Atual', 'Você já possui o plano gratuito');
            return;
        }

        // Não permitir selecionar o mesmo plano
        if (plan.name === userPlan?.plan?.plan_name) {
            Alert.alert('Plano Atual', 'Você já possui este plano');
            return;
        }

        setSelectedPlan(plan);
        setShowConfirmModal(true);
    };

    const handleSubscribe = async () => {
        if (!selectedPlan) return;

        try {
            setSubscribing(true);

            // Se for plano gratuito, usar o método antigo
            if (selectedPlan.name === 'free') {
                const success = await PlanService.subscribeToPlan(user.id, selectedPlan.name);

                if (success) {
                    Alert.alert(
                        'Sucesso!',
                        `Plano ${selectedPlan.display_name} contratado com sucesso!`,
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    setShowConfirmModal(false);
                                    setSelectedPlan(null);
                                    loadPlansAndUserInfo(); // Recarregar dados

                                    // Se veio da tela de anunciar, voltar
                                    if (route.params?.fromAdvertise) {
                                        navigation.goBack();
                                    }
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert('Erro', 'Não foi possível contratar o plano. Tente novamente.');
                }
            } else {
                // Para planos pagos, navegar para a tela de pagamento
                setShowConfirmModal(false);
                setSelectedPlan(null);
                navigation.navigate('PaymentDetails', { plan: selectedPlan });
            }
        } catch (error) {
            console.error('Erro ao contratar plano:', error);
            Alert.alert('Erro', 'Não foi possível contratar o plano. Tente novamente.');
        } finally {
            setSubscribing(false);
        }
    };

    const renderPlanCard = (plan) => {
        const isCurrentPlan = userPlan?.plan?.plan_name === plan.name;
        const isFreePlan = plan.name === 'free';
        const isPopular = plan.name === 'silver';

        return (
            <TouchableOpacity
                key={plan.id}
                style={[
                    styles.planCard,
                    isCurrentPlan && styles.currentPlanCard,
                    isPopular && styles.popularPlanCard
                ]}
                onPress={() => handlePlanSelection(plan)}
                disabled={isCurrentPlan}
            >
                {isPopular && (
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Mais Popular</Text>
                    </View>
                )}

                {isCurrentPlan && (
                    <View style={styles.currentPlanBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                        <Text style={styles.currentPlanText}>Plano Atual</Text>
                    </View>
                )}

                <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.display_name}</Text>
                    <View style={styles.planPrice}>
                        <Text style={styles.priceValue}>
                            {isFreePlan ? 'Grátis' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                        </Text>
                        {!isFreePlan && <Text style={styles.pricePeriod}>/mês</Text>}
                    </View>
                </View>

                <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={[
                        styles.selectButton,
                        isCurrentPlan && styles.currentPlanButton
                    ]}
                    onPress={() => handlePlanSelection(plan)}
                    disabled={isCurrentPlan}
                >
                    <Text style={[
                        styles.selectButtonText,
                        isCurrentPlan && styles.currentPlanButtonText
                    ]}>
                        {isCurrentPlan ? 'Plano Atual' : 'Selecionar Plano'}
                    </Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <Text style={styles.loadingText}>Carregando planos...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Escolha seu Plano</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color="#3498db" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Como funciona?</Text>
                        <Text style={styles.infoText}>
                            Escolha um plano que se adapte às suas necessidades. Você pode alterar seu plano a qualquer momento.
                        </Text>
                    </View>
                </View>

                {/* Current Plan Info */}
                {userPlan?.plan && (
                    <View style={styles.currentPlanInfo}>
                        <Text style={styles.currentPlanTitle}>Seu Plano Atual</Text>
                        <View style={styles.currentPlanDetails}>
                            <Text style={styles.currentPlanName}>{userPlan.plan.display_name}</Text>
                            <Text style={styles.currentPlanStatus}>
                                {userPlan.canCreate.can_create
                                    ? `${userPlan.canCreate.current_ads}/${userPlan.canCreate.max_ads} anúncios ativos`
                                    : userPlan.canCreate.reason
                                }
                            </Text>
                        </View>
                    </View>
                )}

                {/* Plans List */}
                <View style={styles.plansSection}>
                    <Text style={styles.sectionTitle}>Planos Disponíveis</Text>
                    <View style={styles.plansList}>
                        {plans.map(renderPlanCard)}
                    </View>
                </View>

                {/* Features Comparison */}
                <View style={styles.featuresSection}>
                    <Text style={styles.sectionTitle}>Recursos Inclusos</Text>
                    <View style={styles.featuresGrid}>
                        <View style={styles.featureCard}>
                            <Ionicons name="camera" size={24} color="#3498db" />
                            <Text style={styles.featureCardTitle}>Fotos Ilimitadas</Text>
                            <Text style={styles.featureCardText}>
                                Adicione quantas fotos quiser aos seus anúncios
                            </Text>
                        </View>
                        <View style={styles.featureCard}>
                            <Ionicons name="analytics" size={24} color="#e74c3c" />
                            <Text style={styles.featureCardTitle}>Relatórios</Text>
                            <Text style={styles.featureCardText}>
                                Acompanhe o desempenho dos seus anúncios
                            </Text>
                        </View>
                        <View style={styles.featureCard}>
                            <Ionicons name="headset" size={24} color="#2ecc71" />
                            <Text style={styles.featureCardTitle}>Suporte</Text>
                            <Text style={styles.featureCardText}>
                                Suporte especializado para corretores
                            </Text>
                        </View>
                        <View style={styles.featureCard}>
                            <Ionicons name="trending-up" size={24} color="#f39c12" />
                            <Text style={styles.featureCardTitle}>Destaque</Text>
                            <Text style={styles.featureCardText}>
                                Seus anúncios aparecem em destaque
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar Contratação</Text>
                        <Text style={styles.modalText}>
                            Você está prestes a contratar o plano {selectedPlan?.display_name}.
                        </Text>
                        {selectedPlan?.name === 'free' ? (
                            <Text style={styles.modalSubtext}>
                                Este é um plano gratuito. Nenhum pagamento será processado.
                            </Text>
                        ) : (
                            <Text style={styles.modalSubtext}>
                                Pagamento será processado via Mercado Pago.
                            </Text>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowConfirmModal(false)}
                                disabled={subscribing}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={handleSubscribe}
                                disabled={subscribing}
                            >
                                {subscribing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>
                                        {selectedPlan?.name === 'free' ? 'Confirmar' : 'Pagar Agora'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    placeholder: {
        width: 34,
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
    infoCard: {
        backgroundColor: '#e8f4fd',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoContent: {
        marginLeft: 15,
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 5,
    },
    infoText: {
        fontSize: 14,
        color: '#7f8c8d',
        lineHeight: 20,
    },
    currentPlanInfo: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    currentPlanTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 10,
    },
    currentPlanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentPlanName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
    },
    currentPlanStatus: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    plansSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    plansList: {
        paddingHorizontal: 20,
        gap: 15,
    },
    planCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        position: 'relative',
    },
    currentPlanCard: {
        borderColor: '#2ecc71',
        borderWidth: 2,
    },
    popularPlanCard: {
        borderColor: '#f39c12',
        borderWidth: 2,
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
        fontSize: 12,
        fontWeight: '600',
    },
    currentPlanBadge: {
        position: 'absolute',
        top: -10,
        left: 20,
        backgroundColor: '#2ecc71',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    currentPlanText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    planHeader: {
        marginBottom: 20,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    planPrice: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    priceValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#3498db',
    },
    pricePeriod: {
        fontSize: 14,
        color: '#7f8c8d',
        marginLeft: 5,
    },
    planFeatures: {
        marginBottom: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 8,
    },
    selectButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    currentPlanButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    selectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    currentPlanButtonText: {
        color: '#7f8c8d',
    },
    featuresSection: {
        marginBottom: 30,
    },
    featuresGrid: {
        paddingHorizontal: 20,
        gap: 15,
    },
    featureCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    featureCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginTop: 10,
        marginBottom: 5,
        textAlign: 'center',
    },
    featureCardText: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: '#2c3e50',
        marginBottom: 10,
        textAlign: 'center',
        lineHeight: 22,
    },
    modalSubtext: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 20,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e74c3c',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#e74c3c',
        fontSize: 16,
        fontWeight: '600',
    },
    modalConfirmButton: {
        flex: 1,
        backgroundColor: '#3498db',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 