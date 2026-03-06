import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Modal,
    Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import BackendService from '../lib/backendService';
import { PushNotificationService } from '../lib/pushNotificationService';
import {
    initIAP,
    purchaseProduct,
    getReceipt,
    finishPurchase,
    getAppleProductIdForPlan,
    getProducts,
} from '../lib/iapService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase.js';
import StandardHeader from './StandardHeader';
import { PlanService } from '../lib/planService';
import AppText from './AppText';
// Modal removido: fluxo migrado para telas dedicadas


export default function PaymentDetailsScreen({ route, navigation }) {
    const { plan } = route.params;
    const [selectedPeriod, setSelectedPeriod] = useState(null); // Será definido dinamicamente
    const [planOptions, setPlanOptions] = useState({ monthly: null, annual: null });
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [currentUserPlan, setCurrentUserPlan] = useState(null);
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [webViewVisible, setWebViewVisible] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [currentPlan, setCurrentPlan] = useState(null);
    const [currentAdsCount, setCurrentAdsCount] = useState(0);
    const [currentPaymentId, setCurrentPaymentId] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [showPaymentInfoModal, setShowPaymentInfoModal] = useState(false);

    // Estados do fluxo antigo removidos

    useEffect(() => {
        // Carregar opções de plano (mensal e anual) e plano atual do usuário
        loadPlanOptions();
        loadCurrentUserPlan();
    }, []);

    const loadCurrentUserPlan = async () => {
        try {
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select(`
                    *,
                    plans:plan_id (
                        id,
                        name,
                        display_name,
                        period
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (!error && data) {
                setCurrentUserPlan(data);
                // Definir período padrão baseado no plano atual
                if (data.plans?.name === `${plan.name}_annual`) {
                    setSelectedPeriod('monthly'); // Se tem anual, selecionar mensal
                } else if (data.plans?.name === plan.name) {
                    setSelectedPeriod('annual'); // Se tem mensal, selecionar anual
                } else {
                    setSelectedPeriod('annual'); // Padrão
                }
            } else {
                setSelectedPeriod('annual'); // Se não tem plano, padrão anual
            }
        } catch (error) {
            console.error('Erro ao carregar plano atual do usuário:', error);
        }
    };

    const loadPlanOptions = async () => {
        try {
            // Buscar plano mensal
            const { data: monthlyPlan, error: monthlyError } = await supabase
                .from('plans')
                .select('*')
                .eq('name', plan.name)
                .eq('period', 'monthly')
                .single();

            // Buscar plano anual
            const { data: annualPlan, error: annualError } = await supabase
                .from('plans')
                .select('*')
                .eq('name', `${plan.name}_annual`)
                .eq('period', 'annual')
                .single();

            if (!monthlyError && monthlyPlan) {
                setPlanOptions(prev => ({ ...prev, monthly: monthlyPlan }));
            }

            if (!annualError && annualPlan) {
                setPlanOptions(prev => ({ ...prev, annual: annualPlan }));
            }
        } catch (error) {
            console.error('Erro ao carregar opções de plano:', error);
        } finally {
            setLoadingPlans(false);
        }
    };

    // Função para verificar se uma opção está bloqueada
    const isOptionBlocked = (period) => {
        if (!currentUserPlan || !planOptions.monthly || !planOptions.annual) {
            return false;
        }

        const currentPlanName = currentUserPlan.plans?.name;

        // Se tem plano mensal ativo, bloquear opção mensal
        if (period === 'monthly' && currentPlanName === planOptions.monthly.name) {
            return true;
        }

        // Se tem plano anual ativo, bloquear opção anual
        if (period === 'annual' && currentPlanName === planOptions.annual.name) {
            return true;
        }

        return false;
    };

    // Função para definir período padrão (não bloqueado)
    const getDefaultPeriod = () => {
        if (isOptionBlocked('annual')) {
            return 'monthly';
        }
        return 'annual';
    };

    // Função para verificar se pode fazer downgrade
    const checkDowngradePossibility = async () => {
        try {
            // Buscar plano atual do usuário
            const { data: currentSubscription, error: subError } = await supabase
                .from('user_subscriptions')
                .select(`
                    *,
                    plans:plan_id (
                        id,
                        name,
                        display_name,
                        max_ads
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (subError && subError.code !== 'PGRST116') {
                console.error('Erro ao buscar assinatura atual:', subError);
                return { canDowngrade: true, message: '' };
            }

            if (currentSubscription) {
                setCurrentPlan(currentSubscription.plans);

                // Contar anúncios ativos do usuário
                const { count: adsCount, error: adsError } = await supabase
                    .from('properties')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .in('status', ['pending', 'approved']);

                if (adsError) {
                    console.error('Erro ao contar anúncios:', adsError);
                    return { canDowngrade: true, message: '' };
                }

                setCurrentAdsCount(adsCount || 0);

                // Verificar se o novo plano tem menos anúncios que os atuais
                if (plan.max_ads < currentSubscription.plans.max_ads) {
                    if (adsCount > plan.max_ads) {
                        return {
                            canDowngrade: false,
                            message: `Você tem ${adsCount} anúncios ativos, mas o plano ${plan.display_name} permite apenas ${plan.max_ads}. Remova alguns anúncios antes de fazer o downgrade.`
                        };
                    }
                }
            }

            return { canDowngrade: true, message: '' };
        } catch (error) {
            console.error('Erro na verificação de downgrade:', error);
            return { canDowngrade: true, message: '' };
        }
    };

    // Carregar informações do plano atual quando a tela abrir
    useEffect(() => {
        const loadCurrentPlanInfo = async () => {
            if (user) {
                await checkDowngradePossibility();
            }
        };

        loadCurrentPlanInfo();
    }, [user]);

    const handlePayment = async () => {
        if (!user) {
            Alert.alert('Erro', 'Usuário não autenticado');
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Iniciando pagamento...', {
                plan: plan.name,
                user: user.email
            });

            // Verificar se pode fazer downgrade
            const downgradeCheck = await checkDowngradePossibility();
            if (!downgradeCheck.canDowngrade) {
                Alert.alert('Downgrade Bloqueado', downgradeCheck.message);
                setLoading(false);
                return;
            }

            // Configurar notificações
            await PushNotificationService.requestPermissions();

            // Usar o plano selecionado baseado no período
            const selectedPlan = selectedPeriod === 'annual' ? planOptions.annual : planOptions.monthly;

            if (!selectedPlan) {
                Alert.alert('Erro', 'Este plano não está disponível no momento.');
                setLoading(false);
                return;
            }

            // 🔍 VALIDAÇÃO: Verificar anúncios inativos antes do pagamento
            console.log('🔍 Validando anúncios inativos...');
            const validation = await PlanService.validatePlanSelection(user.id, selectedPlan.max_ads);

            if (!validation.canProceed) {
                console.log('❌ Validação falhou:', validation);
                // Navegar para tela de opções
                setLoading(false);
                navigation.navigate('InactiveAdsOptions', {
                    validation,
                    userId: user.id,
                    plan
                });
                return;
            }

            console.log('✅ Validação aprovada:', validation);

            // iOS: In-App Purchase
            if (Platform.OS === 'ios') {
                console.log('🍎 [PaymentDetails] selectedPlan:', { id: selectedPlan?.id, name: selectedPlan?.name, period: selectedPlan?.period });
                const productId = getAppleProductIdForPlan(selectedPlan);
                if (!productId) {
                    throw new Error('Product ID não configurado para este plano');
                }
                console.log('🍎 [PaymentDetails] Product ID para compra:', productId);
                await initIAP();
                const availableProducts = await getProducts([productId]);
                if (availableProducts.length === 0) {
                    setLoading(false);
                    Alert.alert(
                        'Produto não disponível',
                        'Este produto não está disponível no momento. Tente novamente mais tarde.'
                    );
                    return;
                }
                console.log('🍎 [PaymentDetails] Produto encontrado:', availableProducts[0]?.title, availableProducts[0]?.price);
                const purchaseResult = await purchaseProduct(productId);
                if (purchaseResult.cancelled) {
                    setLoading(false);
                    return;
                }
                if (!purchaseResult.success || !purchaseResult.purchase) {
                    throw new Error(purchaseResult.error || 'Compra não concluída');
                }
                const receiptData = await getReceipt();
                console.log('🍎 [PaymentDetails] Receipt obtido:', receiptData ? `${receiptData.substring(0, 50)}...` : 'null');
                if (!receiptData) {
                    throw new Error('Não foi possível obter o comprovante da compra');
                }
                console.log('🍎 [PaymentDetails] Enviando para verificação:', { type: 'plan', planId: selectedPlan.id, transactionId: purchaseResult.purchase?.transactionId || purchaseResult.purchase?.id });
                const verifyResult = await BackendService.verifyIAPReceipt({
                    type: 'plan',
                    receipt: receiptData,
                    userId: user.id,
                    planId: selectedPlan.id,
                    transactionId: purchaseResult.purchase.transactionId || purchaseResult.purchase.id,
                    productId,
                });
                await finishPurchase(purchaseResult.purchase);
                if (verifyResult.success) {
                    Alert.alert('Pagamento aprovado', 'Sua assinatura foi ativada com sucesso.');
                    navigation.navigate('PaymentConfirmation', { plan });
                } else if (verifyResult.alreadyProcessed) {
                    Alert.alert('Pagamento aprovado', 'Sua assinatura já estava ativa.');
                    navigation.navigate('PaymentConfirmation', { plan });
                } else {
                    throw new Error(verifyResult.error || 'Erro ao ativar assinatura');
                }
                setLoading(false);
                return;
            }

            // Android: Mercado Pago
            const result = await BackendService.createPayment(selectedPlan, user);
            console.log('✅ Pagamento criado:', result);
            if (result?.payment?.id) {
                setCurrentPaymentId(result.payment.id);
            }
            const paymentUrl = result?.preference?.init_point || result?.preference?.sandbox_init_point;
            if (!paymentUrl) {
                throw new Error('URL de checkout não encontrada na preferência');
            }
            setCheckoutUrl(paymentUrl);
            setWebViewVisible(true);

        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            Alert.alert(
                'Erro no pagamento',
                'Ocorreu um erro no pagamento. Por favor, tente novamente mais tarde. Se o problema continuar, entre em contato com o suporte.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewNavChange = (navState) => {
        const url = navState?.url || '';
        // Detectar finalização via deep links (se configurados) ou back_urls do backend
        const isSuccess = url.startsWith('buscabuscaimoveis://payment/success') || url.includes('/api/payments/success');
        const isFailure = url.startsWith('buscabuscaimoveis://payment/error') || url.includes('/api/payments/failure');
        const isPending = url.startsWith('buscabuscaimoveis://payment/pending') || url.includes('/api/payments/pending');

        if (isSuccess || isFailure || isPending) {
            setWebViewVisible(false);
            // Após fechar, seguir para tela de confirmação mantendo o mesmo comportamento atual
            navigation.navigate('PaymentConfirmation', {
                // Opcional: poderíamos passar o status detectado; manteremos fluxo existente
                plan: plan
            });
        }
    };

    // Handlers para o modal de anúncios inativos
    const handlePlanChange = () => {
        console.log('📋 Usuário optou por escolher outro plano');
        setShowInactiveAdsModal(false);
        navigation.goBack(); // Volta para PlansScreen
    };

    const handleAdsDeleted = (deletedAds) => {
        console.log('🗑️ Anúncios excluídos:', deletedAds);
        setShowInactiveAdsModal(false);
        // Retentar pagamento após exclusão
        Alert.alert(
            'Anúncios Excluídos',
            'Anúncios excluídos com sucesso! Você pode prosseguir com o pagamento.',
            [
                {
                    text: 'Prosseguir',
                    onPress: () => handlePayment()
                }
            ]
        );
    };

    // Polling do status enquanto a WebView está aberta
    useEffect(() => {
        if (!webViewVisible || !currentPaymentId) return;

        console.log('🚀 Iniciando polling para paymentId:', currentPaymentId);
        let isCancelled = false;
        setCheckingStatus(true);

        const start = Date.now();
        const FAST_POLL_INTERVAL_MS = 3000; // 3 segundos
        const SLOW_POLL_INTERVAL_MS = 10000; // 10 segundos
        const FAST_PHASE_DURATION_MS = 180000; // 3 minutos
        const MAX_DURATION_MS = 300000; // 5 minutos

        const poll = async () => {
            if (isCancelled) return;
            try {
                const result = await BackendService.checkPaymentStatus(currentPaymentId);
                const status = result?.payment?.status;
                // console.log('⏱️ Poll status:', status);
                if (status === 'approved') {
                    if (!isCancelled) {
                        setCheckingStatus(false);
                        setWebViewVisible(false);
                        Alert.alert('Pagamento aprovado', 'Sua assinatura foi ativada com sucesso.');
                        navigation.navigate('PaymentConfirmation', { plan });
                    }
                    return;
                }
            } catch (e) {
                // silenciar erros intermitentes de rede
            }

            const elapsed = Date.now() - start;

            if (elapsed < MAX_DURATION_MS) {
                // Determinar intervalo baseado no tempo decorrido
                const interval = elapsed < FAST_PHASE_DURATION_MS
                    ? FAST_POLL_INTERVAL_MS
                    : SLOW_POLL_INTERVAL_MS;

                setTimeout(poll, interval);
            } else {
                setCheckingStatus(false);
                // Mostrar modal informativo quando polling terminar
                setShowPaymentInfoModal(true);
            }
        };

        const timer = setTimeout(poll, FAST_POLL_INTERVAL_MS);
        return () => {
            console.log('🛑 Parando polling para paymentId:', currentPaymentId);
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [webViewVisible, currentPaymentId]);

    const getPlanFeatures = () => {
        // Se o plano tem features definidas, usar elas
        if (plan.features && Array.isArray(plan.features)) {
            return plan.features;
        }

        // Caso contrário, usar features padrão baseadas no nome do plano
        switch (plan.name) {
            case 'gold':
                return [
                    'Anúncios ilimitados',
                    'Destaque nos resultados',
                    'Estatísticas avançadas',
                    'Suporte prioritário'
                ];
            case 'silver':
                return [
                    'Até 10 anúncios',
                    'Destaque nos resultados',
                    'Estatísticas básicas',
                    'Suporte por email'
                ];
            case 'bronze':
                return [
                    'Até 5 anúncios',
                    'Destaque básico',
                    'Estatísticas básicas'
                ];
            case 'essential':
                return [
                    '1 anúncio ativo',
                    'Destaque básico',
                    'Suporte por email'
                ];
            default:
                return [
                    'Recursos básicos',
                    'Suporte por email'
                ];
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#27ae60" />
                    <AppText style={styles.loadingText}>Processando pagamento...</AppText>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>

            <StandardHeader
                title="Detalhes do Plano"
                subtitle="Detalhes do plano selecionado"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />
            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


                    {/* Plan Card */}
                    <View style={styles.planCard}>
                        <View style={styles.planHeader}>
                            <Ionicons name="star" size={24} color="#f39c12" />
                            <AppText style={styles.planName}>{plan.display_name || plan.name || 'Plano'}</AppText>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.planFeatures}>
                            <AppText style={styles.featuresTitle}>Recursos Inclusos:</AppText>
                            {getPlanFeatures().map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        style={styles.featureIcon}
                                    />
                                    <AppText style={styles.featureText}>{feature}</AppText>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Period Selection */}
                    {loadingPlans ? (
                        <View style={styles.periodSelectionCard}>
                            <AppText style={styles.periodSelectionTitle}>Selecione um plano</AppText>

                            {/* Skeleton para Plano Anual */}
                            <View style={styles.periodOptionSkeleton}>
                                <View style={styles.periodOptionContent}>
                                    <View style={styles.periodOptionHeader}>
                                        <View style={styles.skeletonText} />
                                        <View style={styles.skeletonBadge} />
                                    </View>
                                    <View style={styles.skeletonDescription} />
                                </View>
                                <View style={styles.skeletonRadioButton} />
                            </View>

                            {/* Skeleton para Plano Mensal */}
                            <View style={styles.periodOptionSkeleton}>
                                <View style={styles.periodOptionContent}>
                                    <View style={styles.periodOptionHeader}>
                                        <View style={styles.skeletonText} />
                                    </View>
                                    <View style={styles.skeletonDescription} />
                                </View>
                                <View style={styles.skeletonRadioButton} />
                            </View>
                        </View>
                    ) : planOptions.monthly && planOptions.annual ? (
                        <View style={styles.periodSelectionCard}>
                            <AppText style={styles.periodSelectionTitle}>Selecione um plano</AppText>

                            {/* Plano Anual */}
                            <TouchableOpacity
                                style={[
                                    styles.periodOption,
                                    selectedPeriod === 'annual' && styles.periodOptionSelected,
                                    isOptionBlocked('annual') && styles.periodOptionBlocked
                                ]}
                                onPress={() => !isOptionBlocked('annual') && setSelectedPeriod('annual')}
                                disabled={isOptionBlocked('annual')}
                            >
                                <View style={styles.periodOptionContent}>
                                    <View style={styles.periodOptionHeader}>
                                        <AppText style={[
                                            styles.periodOptionTitle,
                                            isOptionBlocked('annual') && styles.periodOptionTitleBlocked
                                        ]}>
                                            Anual
                                        </AppText>
                                        {isOptionBlocked('annual') ? (
                                            <View style={styles.currentBadge}>
                                                <AppText style={styles.currentText}>Atual</AppText>
                                            </View>
                                        ) : planOptions.monthly && planOptions.annual && (
                                            <View style={styles.savingsBadge}>
                                                <AppText style={styles.savingsText}>
                                                    Economize {Math.round((((planOptions.monthly.price * 12) - planOptions.annual.price) / (planOptions.monthly.price * 12)) * 100)}%
                                                </AppText>
                                            </View>
                                        )}
                                    </View>
                                    <AppText style={styles.periodOptionDescription}>
                                        R$ {planOptions.annual.price.toFixed(2).replace('.', ',')}/ano (R$ {(planOptions.annual.price / 12).toFixed(2).replace('.', ',')}/mês)
                                    </AppText>
                                </View>
                                <View style={[
                                    styles.radioButton,
                                    selectedPeriod === 'annual' && styles.radioButtonSelected,
                                    isOptionBlocked('annual') && styles.radioButtonBlocked
                                ]}>
                                    {selectedPeriod === 'annual' && !isOptionBlocked('annual') && (
                                        <View style={styles.radioButtonInner} />
                                    )}
                                    {isOptionBlocked('annual') && (
                                        <Ionicons name="checkmark" size={12} color="#2ecc71" />
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Plano Mensal */}
                            <TouchableOpacity
                                style={[
                                    styles.periodOption,
                                    selectedPeriod === 'monthly' && styles.periodOptionSelected,
                                    isOptionBlocked('monthly') && styles.periodOptionBlocked
                                ]}
                                onPress={() => !isOptionBlocked('monthly') && setSelectedPeriod('monthly')}
                                disabled={isOptionBlocked('monthly')}
                            >
                                <View style={styles.periodOptionContent}>
                                    <View style={styles.periodOptionHeader}>
                                        <AppText style={[
                                            styles.periodOptionTitle,
                                            isOptionBlocked('monthly') && styles.periodOptionTitleBlocked
                                        ]}>
                                            Mensal
                                        </AppText>
                                        {isOptionBlocked('monthly') && (
                                            <View style={styles.currentBadge}>
                                                <AppText style={styles.currentText}>Atual</AppText>
                                            </View>
                                        )}
                                    </View>
                                    <AppText style={[
                                        styles.periodOptionDescription,
                                        isOptionBlocked('monthly') && styles.periodOptionDescriptionBlocked
                                    ]}>
                                        R$ {planOptions.monthly.price.toFixed(2).replace('.', ',')}/mês
                                    </AppText>
                                </View>
                                <View style={[
                                    styles.radioButton,
                                    selectedPeriod === 'monthly' && styles.radioButtonSelected,
                                    isOptionBlocked('monthly') && styles.radioButtonBlocked
                                ]}>
                                    {selectedPeriod === 'monthly' && !isOptionBlocked('monthly') && (
                                        <View style={styles.radioButtonInner} />
                                    )}
                                    {isOptionBlocked('monthly') && (
                                        <Ionicons name="checkmark" size={12} color="#2ecc71" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* Payment Method Card - Android: Mercado Pago; iOS: oculto (IAP) */}
                    {Platform.OS === 'android' && (
                        <View style={styles.paymentMethodCard}>
                            <View style={styles.mercadopagoInfo}>
                                <Ionicons name="shield-checkmark" size={20} color="#27ae60" />
                                <AppText style={styles.mercadopagoText}>
                                    Mercado Pago - Pagamento 100% seguro
                                </AppText>
                            </View>
                        </View>
                    )}

                    {/* Security Info
                        <View style={styles.securityCard}>
                            <View style={styles.securityHeader}>
                                <Ionicons name="lock-closed" size={20} color="#e74c3c" />
                                <AppText style={styles.securityTitle}>Informações de Segurança</AppText>
                            </View>
                            <View style={styles.securityItems}>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <AppText style={styles.securityText}>Dados criptografados</AppText>
                                </View>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <AppText style={styles.securityText}>Pagamento processado pelo Mercado Pago</AppText>
                                </View>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <AppText style={styles.securityText}>Nenhum dado bancário fica salvo</AppText>
                                </View>
                            </View>
                        </View> */}

                    {/* Downgrade Warning */}
                    {currentPlan && plan.max_ads < currentPlan.max_ads && (
                        <View style={styles.downgradeCard}>
                            <View style={styles.downgradeHeader}>
                                <Ionicons name="warning" size={24} color="#f39c12" />
                                <AppText style={styles.downgradeTitle}>Atenção: Downgrade de Plano</AppText>
                            </View>
                            <View style={styles.downgradeContent}>
                                <AppText style={styles.downgradeText}>
                                    Você está fazendo downgrade do plano <AppText style={styles.planHighlight}>{currentPlan.display_name} </AppText>
                                    para o plano <AppText style={styles.planHighlight}>{plan.display_name}</AppText>.
                                </AppText>
                                <AppText style={styles.downgradeText}>
                                    Anúncios ativos: <AppText style={styles.adsHighlight}>{currentAdsCount}</AppText>
                                </AppText>
                                <AppText style={styles.downgradeText}>
                                    Limite do novo plano: <AppText style={styles.adsHighlight}>{plan.max_ads}</AppText>
                                </AppText>
                                {currentAdsCount > plan.max_ads && (
                                    <AppText style={styles.downgradeWarning}>
                                        ⚠️ Você precisa remover {currentAdsCount - plan.max_ads} anúncio(s) antes de fazer o downgrade.
                                    </AppText>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Payment Button */}
                    <TouchableOpacity
                        style={styles.paymentButton}
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        <Ionicons name="card" size={24} color="#fff" />
                        <AppText style={styles.paymentButtonText}>
                            {Platform.OS === 'ios' ? 'Contratar Plano' : 'Pagar com Mercado Pago'}
                        </AppText>
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <AppText style={styles.cancelButtonText}>Cancelar</AppText>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* WebView - Checkout Mercado Pago */}
            <Modal
                visible={webViewVisible}
                animationType="slide"
                onRequestClose={() => setWebViewVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setWebViewVisible(false)} style={{ padding: 8 }}>
                            <Ionicons name="close" size={24} color="#00335e" />
                        </TouchableOpacity>
                        <AppText style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#00335e' }}>Pagamento Seguro</AppText>
                    </View>
                    {checkoutUrl ? (
                        <WebView
                            source={{ uri: checkoutUrl }}
                            onNavigationStateChange={handleWebViewNavChange}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="large" color="#27ae60" />
                                    <AppText style={{ marginTop: 12, color: '#7f8c8d' }}>Carregando checkout...</AppText>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#27ae60" />
                        </View>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Modal Informativo de Pagamento */}
            <Modal
                visible={showPaymentInfoModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPaymentInfoModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.paymentInfoModal}>
                        <View style={styles.paymentInfoIcon}>
                            <Ionicons name="time-outline" size={48} color="#f39c12" />
                        </View>

                        <AppText style={styles.paymentInfoTitle}>Pagamento em Processamento</AppText>

                        <AppText style={styles.paymentInfoText}>
                            Ainda não detectamos seu pagamento, mas você pode concluir normalmente.
                            Assim que for aprovado, seu plano será ativado automaticamente.
                        </AppText>

                        <View style={styles.paymentInfoButtons}>
                            <TouchableOpacity
                                style={styles.paymentInfoButton}
                                onPress={() => setShowPaymentInfoModal(false)}
                            >
                                <AppText style={styles.paymentInfoButtonText}>Entendi</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </SafeAreaView >
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
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',

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

    backButton: {
        position: 'absolute',
        left: 0,
        padding: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
    },
    placeholder: {
        width: 40, // Ajustar conforme necessário para centralizar o título
    },
    content: {
        flex: 1,
        paddingTop: 15,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
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
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
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
    planCard: {
        width: '90%',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 24,
        paddingTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    planName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 12,
    },
    priceSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    priceValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 4,
    },
    pricePeriod: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginBottom: 20,
    },
    planFeatures: {
        marginBottom: 10,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    featureIcon: {
        marginRight: 12,
        color: '#27ae60',
    },
    featureText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    paymentMethodCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    paymentMethodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    paymentMethodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 12,
    },
    mercadopagoInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f8f5',
        padding: 12,
        borderRadius: 8,
    },
    mercadopagoText: {
        fontSize: 14,
        color: '#27ae60',
        marginLeft: 8,
        fontWeight: '500',
    },
    securityCard: {
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
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    securityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 12,
    },
    securityItems: {
        gap: 8,
    },
    securityItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    securityText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginLeft: 8,
    },
    downgradeCard: {
        backgroundColor: '#fff3cd',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#ffeaa7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    downgradeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    downgradeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#856404',
        marginLeft: 12,
    },
    downgradeContent: {
        gap: 8,
    },
    downgradeText: {
        fontSize: 14,
        color: '#856404',
        lineHeight: 20,
    },
    planHighlight: {
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    adsHighlight: {
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    downgradeWarning: {
        fontSize: 14,
        color: '#e74c3c',
        fontWeight: 'bold',
        lineHeight: 20,
        marginTop: 8,
    },
    paymentButton: {
        backgroundColor: '#27ae60',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 12,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    paymentButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    periodSelectionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        marginHorizontal: 20,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    periodSelectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 20,
        textAlign: 'center',

    },
    periodOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    periodOptionSelected: {
        borderColor: '#f39c12',
        backgroundColor: '#fff8e1',
    },
    periodOptionContent: {
        flex: 1,
    },
    periodOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    periodOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginRight: 10,
    },
    periodOptionDescription: {
        fontSize: 14,
        color: '#7f8c8d',
        lineHeight: 20,
    },
    savingsBadge: {
        backgroundColor: '#f39c12',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    savingsText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
    },
    radioButtonSelected: {
        borderColor: '#f39c12',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#f39c12',
    },
    periodOptionBlocked: {
        backgroundColor: '#f8f9fa',
        borderColor: '#e0e0e0',
        opacity: 0.7,
    },
    periodOptionTitleBlocked: {
        color: '#95a5a6',
    },
    periodOptionDescriptionBlocked: {
        color: '#bdc3c7',
    },
    radioButtonBlocked: {
        borderColor: '#2ecc71',
        backgroundColor: '#e8f5e8',
    },
    currentBadge: {
        backgroundColor: '#2ecc71',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    currentText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    periodOptionSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
    },
    skeletonText: {
        height: 16,
        width: 60,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        marginRight: 10,
    },
    skeletonBadge: {
        height: 20,
        width: 80,
        backgroundColor: '#e0e0e0',
        borderRadius: 12,
    },
    skeletonDescription: {
        height: 14,
        width: '80%',
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        marginTop: 5,
    },
    skeletonRadioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#e0e0e0',
        marginLeft: 15,

    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    paymentInfoModal: {
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        margin: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    paymentInfoIcon: {
        marginBottom: 16,
    },
    paymentInfoTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 16,
        textAlign: 'center',
    },
    paymentInfoText: {
        fontSize: 16,
        color: '#7f8c8d',
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 24,
    },
    paymentInfoButtons: {
        width: '100%',
    },
    paymentInfoButton: {
        backgroundColor: '#3498db',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    paymentInfoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#7f8c8d',
        fontWeight: '500',
    },
}); 