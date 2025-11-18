import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlanService } from '../lib/planService';
import { BackendService } from '../lib/backendService';
import { useAuth } from '../contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import StandardHeader from './StandardHeader';
import AppText from './AppText';

export default function PlansScreen({ navigation, route }) {
    console.log('Rendered PlansScreen');

    const { user } = useAuth();
    const [plans, setPlans] = useState([]);
    const [groupedPlans, setGroupedPlans] = useState({ monthly: [], annual: [] });
    const [userPlan, setUserPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const scrollViewRef = React.useRef(null);
    const goldCardRef = React.useRef(null);

    useEffect(() => {
        loadPlansAndUserInfo();
    }, []);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            console.log('🔄 PlansScreen: Atualizando dados...');
            console.log('Rendered PlansScreen');

            loadPlansAndUserInfo();
        }, [])
    );

    const loadPlansAndUserInfo = async () => {
        try {
            setLoading(true);
            const [plansData, groupedPlansData, userPlanInfo] = await Promise.all([
                PlanService.getAvailablePlans(),
                PlanService.getPlansGroupedByPeriod(),
                PlanService.getUserPlanInfo(user.id)
            ]);

            setPlans(plansData);
            setGroupedPlans(groupedPlansData);
            setUserPlan(userPlanInfo);

            // Se houver parâmetro para destacar plano específico, rolar até ele
            if (route.params?.highlightPlan && goldCardRef.current) {
                setTimeout(() => {
                    goldCardRef.current?.measureLayout(
                        scrollViewRef.current,
                        (x, y) => {
                            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
                        }
                    );
                }, 500);
            }
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

        // Verificar se está tentando voltar para plano gratuito
        if (plan.name === 'free' && userPlan?.plan?.plan_name !== 'free') {
            Alert.alert(
                'Downgrade para Plano Gratuito',
                'Para voltar ao plano gratuito, entre em contato com nosso suporte através do WhatsApp ou email.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Entendi',
                        style: 'default'
                    }
                ]
            );
            return;
        }

        // Se for plano gratuito (e não for downgrade), usar método antigo
        if (plan.name === 'free') {
            setSelectedPlan(plan);
            setShowConfirmModal(true);
        } else {
            // Para planos pagos, ir direto para PaymentDetails (mesmo se for o plano atual)
            navigation.navigate('PaymentDetails', { plan: plan });
        }
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
                // Para planos pagos, verificar downgrade ANTES de navegar
                try {
                    console.log('🔍 Verificando possibilidade de downgrade...');

                    // Simular uma chamada para verificar downgrade
                    const testData = {
                        plan: selectedPlan,
                        user: { id: user.id, email: user.email }
                    };

                    const response = await BackendService.createPayment(testData);

                    // Se chegou até aqui, não é downgrade ou é permitido
                    console.log('✅ Downgrade permitido ou upgrade detectado');
                    setShowConfirmModal(false);
                    setSelectedPlan(null);
                    navigation.navigate('PaymentDetails', { plan: selectedPlan });

                } catch (error) {
                    console.log('❌ Erro na verificação:', error);

                    // Verificar se é erro de downgrade bloqueado
                    if (error.response?.status === 400 && error.response?.data?.error === 'downgrade_blocked') {
                        const errorData = error.response.data;
                        Alert.alert(
                            'Downgrade Não Permitido',
                            errorData.message,
                            [
                                {
                                    text: 'Entendi',
                                    style: 'cancel'
                                }
                            ]
                        );
                    } else {
                        // Outro tipo de erro, permitir continuar
                        console.log('⚠️ Erro não relacionado ao downgrade, continuando...');
                        setShowConfirmModal(false);
                        setSelectedPlan(null);
                        navigation.navigate('PaymentDetails', { plan: selectedPlan });
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao contratar plano:', error);
            Alert.alert('Erro', 'Não foi possível contratar o plano. Tente novamente.');
        } finally {
            setSubscribing(false);
        }
    };

    const renderPlanCard = (plan) => {
        // Verificação de segurança para evitar erros quando userPlan ainda não foi carregado
        if (!userPlan) {
            return null;
        }

        // Verificar se é o plano atual (mensal ou anual)
        const isCurrentPlanMonthly = userPlan?.plan?.plan_name === plan.name;
        const isCurrentPlanAnnual = userPlan?.plan?.plan_name === `${plan.name}_annual`;
        const isCurrentPlan = isCurrentPlanMonthly || isCurrentPlanAnnual;
        const isFreePlan = plan.name === 'free';
        const isPopular = plan.name === 'silver';
        const isGoldPlan = plan.name === 'gold';
        const isDowngradeToFree = isFreePlan && userPlan?.plan?.plan_name && userPlan.plan.plan_name !== 'free';

        // Encontrar plano anual correspondente para calcular preço mais baixo
        const annualPlan = groupedPlans.annual.find(annual =>
            annual.name === `${plan.name}_annual`
        );

        // Calcular preço mais baixo (anual/12 se existir, senão mensal)
        const lowestPrice = annualPlan ? annualPlan.price / 12 : plan.price;
        const hasAnnualOption = !!annualPlan;

        return (
            <View
                key={plan.id}
                ref={isGoldPlan ? goldCardRef : null}
                collapsable={false}
            >
                <TouchableOpacity
                    style={[
                        styles.planCard,
                        isCurrentPlan && styles.currentPlanCard,
                        isPopular && styles.popularPlanCard
                    ]}
                    onPress={() => handlePlanSelection(plan)}
                    disabled={isDowngradeToFree}
                >
                    {isPopular && (
                        <View style={styles.popularBadge}>
                            <AppText style={styles.popularText}>Mais Popular</AppText>
                        </View>
                    )}

                    {isCurrentPlan && (
                        <View style={styles.currentPlanBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                            <AppText style={styles.currentPlanText}>Plano Atual</AppText>
                        </View>
                    )}

                    <View style={styles.planHeader}>
                        <AppText style={styles.planName}>{plan.display_name}</AppText>
                        <View style={styles.planPrice}>
                            <AppText style={styles.priceValue}>
                                {isFreePlan ? 'Grátis' : `R$ ${lowestPrice.toFixed(2).replace('.', ',')}`}
                            </AppText>
                            {!isFreePlan && (
                                <AppText style={styles.pricePeriod}>
                                    /mês{hasAnnualOption ? ' (a partir de)' : ''}
                                </AppText>
                            )}
                        </View>
                    </View>

                    <View style={styles.planFeatures}>
                        {plan.features && plan.features.length > 0 ? plan.features.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                                <AppText style={styles.featureText}>{feature}</AppText>
                            </View>
                        )) : null}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.selectButton,
                            isCurrentPlan && styles.currentPlanButton,
                            isDowngradeToFree && styles.disabledButton
                        ]}
                        onPress={() => handlePlanSelection(plan)}
                        disabled={isDowngradeToFree}
                    >
                        <AppText style={[
                            styles.selectButtonText,
                            isCurrentPlan && styles.currentPlanButtonText,
                            isDowngradeToFree && styles.disabledButtonText
                        ]}>
                            {isCurrentPlan ? 'Alterar Plano' :
                                isDowngradeToFree ? 'Contatar Suporte' : 'Selecionar Plano'}
                        </AppText>
                    </TouchableOpacity>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                    <AppText style={styles.loadingText}>Carregando planos...</AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Padrão com botão de voltar */}
            <StandardHeader
                title="Escolha seu Plano"
                subtitle="Encontre o plano ideal para você"
                showLogo={false}
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <ScrollView
                    ref={scrollViewRef}
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Info Card */}
                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#3498db" />
                        <View style={styles.infoContent}>
                            <AppText style={styles.infoTitle}>Como funciona?</AppText>
                            <AppText style={styles.infoText}>
                                Escolha um plano que se adapte às suas necessidades. Você pode alterar seu plano a qualquer momento.
                            </AppText>
                        </View>
                    </View>

                    {/* Current Plan Info */}
                    {userPlan?.plan && (
                        <View style={styles.currentPlanInfo}>
                            <AppText style={styles.currentPlanTitle}>Seu Plano Atual</AppText>
                            <View style={styles.currentPlanDetails}>
                                <AppText style={styles.currentPlanName}>{userPlan.plan.display_name}</AppText>
                                <AppText style={styles.currentPlanStatus}>
                                    {userPlan.canCreate.can_create
                                        ? `${userPlan.canCreate.current_ads}/${userPlan.canCreate.max_ads} anúncios ativos`
                                        : userPlan.canCreate.reason
                                    }
                                </AppText>
                            </View>
                        </View>
                    )}

                    {/* Plans List */}
                    <View style={styles.plansSection}>
                        <AppText style={styles.sectionTitle}>Planos Disponíveis</AppText>
                        <View style={styles.plansList}>
                            {groupedPlans.monthly && groupedPlans.monthly.length > 0
                                ? groupedPlans.monthly.map(renderPlanCard)
                                : null}
                        </View>
                    </View>

                    {/* Features Comparison */}
                    <View style={styles.featuresSection}>
                        <AppText style={styles.sectionTitle}>Recursos Inclusos</AppText>
                        <View style={styles.featuresGrid}>
                            <View style={styles.featureCard}>
                                <Ionicons name="camera" size={24} color="#3498db" />
                                <AppText style={styles.featureCardTitle}>Limites de fotos de acordo com o plano</AppText>
                                <AppText style={styles.featureCardText}>
                                    Quanto maior o plano, mais fotos você pode adicionar aos seus anúncios
                                </AppText>
                            </View>
                            {/* <View style={styles.featureCard}>
                                <Ionicons name="analytics" size={24} color="#e74c3c" />
                                <AppText style={styles.featureCardTitle}>Relatórios</AppText>
                                <AppText style={styles.featureCardText}>
                                    Acompanhe o desempenho dos seus anúncios
                                </AppText>
                            </View> */}
                            <View style={styles.featureCard}>
                                <Ionicons name="headset" size={24} color="#2ecc71" />
                                <AppText style={styles.featureCardTitle}>Suporte</AppText>
                                <AppText style={styles.featureCardText}>
                                    Suporte especializado para corretores
                                </AppText>
                            </View>
                            <View style={styles.featureCard}>
                                <Ionicons name="trending-up" size={24} color="#f39c12" />
                                <AppText style={styles.featureCardTitle}>Destaque</AppText>
                                <AppText style={styles.featureCardText}>
                                    Possibilidade de Impulsionar seus anúncios para alcançar mais clientes
                                </AppText>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* Confirmation Modal */}
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <AppText style={styles.modalTitle}>Confirmar Contratação</AppText>
                        <AppText style={styles.modalText}>
                            Você está prestes a contratar o plano {selectedPlan?.display_name}.
                        </AppText>
                        {selectedPlan?.name === 'free' ? (
                            <AppText style={styles.modalSubtext}>
                                Este é um plano gratuito. Nenhum pagamento será processado.
                            </AppText>
                        ) : (
                            <AppText style={styles.modalSubtext}>
                                Pagamento será processado via Mercado Pago.
                            </AppText>
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelButton}
                                onPress={() => setShowConfirmModal(false)}
                                disabled={subscribing}
                            >
                                <AppText style={styles.modalCancelText}>Cancelar</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalConfirmButton}
                                onPress={handleSubscribe}
                                disabled={subscribing}
                            >
                                {subscribing ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <AppText style={styles.modalConfirmText}>
                                        {selectedPlan?.name === 'free' ? 'Confirmar' : 'Pagar Agora'}
                                    </AppText>
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
        backgroundColor: '#ffcc1e',
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
        paddingTop: 5,
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
        color: '#00335e',
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
        color: '#00335e',
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
        marginBottom: 10,
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
        backgroundColor: '#3498db',
        borderWidth: 3,
        borderColor: '#f39c12',
    },
    selectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    currentPlanButtonText: {
        color: '#fff',
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
    disabledButton: {
        backgroundColor: '#bdc3c7',
        borderWidth: 1,
        borderColor: '#95a5a6',
    },
    disabledButtonText: {
        color: '#7f8c8d',
    },
}); 