import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import BackendService from '../lib/backendService';
import { PushNotificationService } from '../lib/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase.js';
export default function PaymentDetailsScreen({ route, navigation }) {
    const { plan } = route.params;
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [webViewVisible, setWebViewVisible] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [currentPlan, setCurrentPlan] = useState(null);
    const [currentAdsCount, setCurrentAdsCount] = useState(0);

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

            // Criar pagamento no backend
            const result = await BackendService.createPayment(plan, user);
            console.log('✅ Pagamento criado:', result);

            // Abrir Mercado Pago dentro do app (WebView)
            const paymentUrl = result?.preference?.init_point || result?.preference?.sandbox_init_point;
            console.log('🔗 Abrindo URL no WebView:', paymentUrl);
            if (!paymentUrl) {
                throw new Error('URL de checkout não encontrada na preferência');
            }

            setCheckoutUrl(paymentUrl);
            setWebViewVisible(true);

        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            Alert.alert(
                'Erro',
                'Não foi possível processar o pagamento. Tente novamente.'
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
                    <Text style={styles.loadingText}>Processando pagamento...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
                {/* Header Amarelo com Título */}
                <View style={styles.headerContainer}>
                    <View style={styles.titleContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={24} color="#00335e" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Escolha seu Plano</Text>
                        <View style={styles.placeholder} />

                    </View>
                </View>
                {/* Conteúdo Principal */}
                <View style={styles.contentContainer}>
                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


                        {/* Plan Card */}
                        <View style={styles.planCard}>
                            <View style={styles.planHeader}>
                                <Ionicons name="star" size={24} color="#f39c12" />
                                <Text style={styles.planName}>{plan.display_name || plan.name || 'Plano'}</Text>
                            </View>

                            <View style={styles.priceSection}>
                                <Text style={styles.priceValue}>
                                    R$ {plan.price ? plan.price.toFixed(2).replace('.', ',') : '0,00'}
                                </Text>
                                <Text style={styles.pricePeriod}>pagamento único</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.planFeatures}>
                                <Text style={styles.featuresTitle}>Recursos Inclusos:</Text>
                                {getPlanFeatures().map((feature, index) => (
                                    <View key={index} style={styles.featureItem}>
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={20}
                                            style={styles.featureIcon}
                                        />
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Payment Method Card */}
                        <View style={styles.paymentMethodCard}>
                            <View style={styles.paymentMethodHeader}>
                                <Ionicons name="card-outline" size={24} color="#27ae60" />
                                <Text style={styles.paymentMethodTitle}>Método de Pagamento</Text>
                            </View>
                            <View style={styles.mercadopagoInfo}>
                                <Ionicons name="shield-checkmark" size={20} color="#27ae60" />
                                <Text style={styles.mercadopagoText}>
                                    Mercado Pago - Pagamento 100% seguro
                                </Text>
                            </View>
                        </View>

                        {/* Security Info
                        <View style={styles.securityCard}>
                            <View style={styles.securityHeader}>
                                <Ionicons name="lock-closed" size={20} color="#e74c3c" />
                                <Text style={styles.securityTitle}>Informações de Segurança</Text>
                            </View>
                            <View style={styles.securityItems}>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <Text style={styles.securityText}>Dados criptografados</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <Text style={styles.securityText}>Pagamento processado pelo Mercado Pago</Text>
                                </View>
                                <View style={styles.securityItem}>
                                    <Ionicons name="checkmark" size={16} color="#27ae60" />
                                    <Text style={styles.securityText}>Nenhum dado bancário fica salvo</Text>
                                </View>
                            </View>
                        </View> */}

                        {/* Downgrade Warning */}
                        {currentPlan && plan.max_ads < currentPlan.max_ads && (
                            <View style={styles.downgradeCard}>
                                <View style={styles.downgradeHeader}>
                                    <Ionicons name="warning" size={24} color="#f39c12" />
                                    <Text style={styles.downgradeTitle}>Atenção: Downgrade de Plano</Text>
                                </View>
                                <View style={styles.downgradeContent}>
                                    <Text style={styles.downgradeText}>
                                        Você está fazendo downgrade do plano <Text style={styles.planHighlight}>{currentPlan.display_name} </Text>
                                        para o plano <Text style={styles.planHighlight}>{plan.display_name}</Text>.
                                    </Text>
                                    <Text style={styles.downgradeText}>
                                        Anúncios ativos: <Text style={styles.adsHighlight}>{currentAdsCount}</Text>
                                    </Text>
                                    <Text style={styles.downgradeText}>
                                        Limite do novo plano: <Text style={styles.adsHighlight}>{plan.max_ads}</Text>
                                    </Text>
                                    {currentAdsCount > plan.max_ads && (
                                        <Text style={styles.downgradeWarning}>
                                            ⚠️ Você precisa remover {currentAdsCount - plan.max_ads} anúncio(s) antes de fazer o downgrade.
                                        </Text>
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
                            <Text style={styles.paymentButtonText}>
                                Pagar com Mercado Pago
                            </Text>
                        </TouchableOpacity>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
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
                            <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#00335e' }}>Pagamento Seguro</Text>
                        </View>
                        {checkoutUrl ? (
                            <WebView
                                source={{ uri: checkoutUrl }}
                                onNavigationStateChange={handleWebViewNavChange}
                                startInLoadingState
                                renderLoading={() => (
                                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="large" color="#27ae60" />
                                        <Text style={{ marginTop: 12, color: '#7f8c8d' }}>Carregando checkout...</Text>
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
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
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
        marginBottom: 16,
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
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
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