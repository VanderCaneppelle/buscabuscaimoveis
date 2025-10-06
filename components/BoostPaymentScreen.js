import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Image,
    Alert,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import BackendService from '../lib/backendService';
import { useAuth } from '../contexts/AuthContext';

export default function BoostPaymentScreen({ navigation, route }) {
    console.log('Rendered BoostPaymentScreen');

    const { property, boostPlan } = route.params;
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [webViewVisible, setWebViewVisible] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [currentPaymentId, setCurrentPaymentId] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [showBoostSuccessModal, setShowBoostSuccessModal] = useState(false);

    const handlePayment = async () => {
        if (!user) {
            Alert.alert('Erro', 'Usuário não autenticado');
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Iniciando pagamento de boost...', {
                property: property.title,
                plan: boostPlan.name,
                user: user.email
            });

            // Criar pagamento no backend (será implementado)
            const result = await BackendService.createBoostPayment({
                property,
                boostPlan,
                user
            });

            console.log('✅ Pagamento criado:', result);

            // Guardar paymentId para polling
            if (result?.payment?.id) {
                setCurrentPaymentId(result.payment.id);
            }

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
            Alert.alert('Erro', 'Não foi possível processar o pagamento. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewClose = () => {
        setWebViewVisible(false);
        navigation.navigate('MyProperties');
    };

    // Polling do status enquanto a WebView está aberta
    React.useEffect(() => {
        if (!webViewVisible || !currentPaymentId) return;

        console.log('🚀 Iniciando polling para boost paymentId:', currentPaymentId);
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
                console.log('⏱️ Boost poll status:', status);

                if (status === 'approved') {
                    if (!isCancelled) {
                        setCheckingStatus(false);
                        setWebViewVisible(false);
                        setShowBoostSuccessModal(true);
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
            }
        };

        const timer = setTimeout(poll, FAST_POLL_INTERVAL_MS);
        return () => {
            console.log('🛑 Parando polling de boost');
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [webViewVisible, currentPaymentId]);

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
                <Text style={styles.headerTitle}>Confirmar Impulsionamento</Text>
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

                    {/* Boost Plan Card */}
                    <View style={styles.planCard}>
                        <View style={styles.planHeader}>
                            <Ionicons name="rocket" size={24} color="#f39c12" />
                            <Text style={styles.planName}>Impulsionamento</Text>
                        </View>

                        <View style={styles.planDetails}>
                            <View style={styles.planDetailRow}>
                                <Text style={styles.planDetailLabel}>Duração:</Text>
                                <Text style={styles.planDetailValue}>
                                    {boostPlan.duration_days === 1 ? '1 dia' : `${boostPlan.duration_days} dias`}
                                </Text>
                            </View>
                            <View style={styles.planDetailRow}>
                                <Text style={styles.planDetailLabel}>Valor:</Text>
                                <Text style={styles.planDetailValue}>
                                    R$ {boostPlan.price.toFixed(2).replace('.', ',')}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.benefitsTitle}>O que você ganha:</Text>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#2ecc71" />
                            <Text style={styles.benefitText}>
                                Anúncio aparece na aba "Destaques"
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#2ecc71" />
                            <Text style={styles.benefitText}>
                                Até 10x mais visibilidade
                            </Text>
                        </View>
                        <View style={styles.benefitItem}>
                            <Ionicons name="checkmark-circle" size={18} color="#2ecc71" />
                            <Text style={styles.benefitText}>
                                Venda mais rápido
                            </Text>
                        </View>
                    </View>

                    {/* Payment Method Card */}
                    <View style={styles.paymentMethodCard}>
                        <View style={styles.paymentMethodHeader}>
                            <Ionicons name="card-outline" size={24} color="#27ae60" />
                            <Text style={styles.paymentMethodTitle}>Método de Pagamento</Text>
                        </View>
                        <Text style={styles.paymentMethodText}>
                            Mercado Pago - Pagamento seguro
                        </Text>
                        <Text style={styles.paymentMethodSubtext}>
                            Cartão de crédito, débito, Pix e mais
                        </Text>
                    </View>

                </ScrollView>

                {/* Payment Button */}
                <View style={styles.footer}>
                    <View style={styles.totalSection}>
                        <Text style={styles.totalLabel}>Total a pagar:</Text>
                        <Text style={styles.totalValue}>
                            R$ {boostPlan.price.toFixed(2).replace('.', ',')}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="card" size={24} color="#fff" />
                                <Text style={styles.paymentButtonText}>
                                    Pagar com Mercado Pago
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* WebView Modal para Mercado Pago */}
            <Modal
                visible={webViewVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleWebViewClose}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.webViewHeader}>
                        <TouchableOpacity onPress={handleWebViewClose}>
                            <Ionicons name="close" size={28} color="#00335e" />
                        </TouchableOpacity>
                        <Text style={styles.webViewTitle}>Mercado Pago</Text>
                        <View style={{ width: 28 }} />
                    </View>
                    {checkoutUrl ? (
                        <WebView
                            source={{ uri: checkoutUrl }}
                            startInLoadingState={true}
                            renderLoading={() => (
                                <View style={styles.webViewLoading}>
                                    <ActivityIndicator size="large" color="#3498db" />
                                </View>
                            )}
                        />
                    ) : null}
                </SafeAreaView>
            </Modal>

            {/* Modal de Sucesso - Anúncio Impulsionado */}
            <Modal
                visible={showBoostSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => {
                    setShowBoostSuccessModal(false);
                    navigation.navigate('MyProperties');
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconContainer}>
                            <Text style={styles.successIcon}>🚀</Text>
                        </View>
                        <Text style={styles.modalTitle}>Anúncio Impulsionado!</Text>
                        <Text style={styles.modalMessage}>
                            Seu anúncio já está aparecendo na seção de Destaques e será visto por muito mais pessoas!
                        </Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowBoostSuccessModal(false);
                                navigation.navigate('MyProperties');
                            }}
                        >
                            <Text style={styles.modalButtonText}>Ver Meus Anúncios</Text>
                        </TouchableOpacity>
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
    planCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 10,
    },
    planDetails: {
        marginBottom: 15,
    },
    planDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    planDetailLabel: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    planDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
    },
    divider: {
        height: 1,
        backgroundColor: '#e9ecef',
        marginVertical: 15,
    },
    benefitsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 10,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 8,
    },
    paymentMethodCard: {
        backgroundColor: '#f0fdf4',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#86efac',
    },
    paymentMethodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    paymentMethodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#166534',
        marginLeft: 10,
    },
    paymentMethodText: {
        fontSize: 14,
        color: '#166534',
        marginBottom: 5,
    },
    paymentMethodSubtext: {
        fontSize: 12,
        color: '#15803d',
    },
    footer: {
        backgroundColor: '#fff',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    totalLabel: {
        fontSize: 16,
        color: '#7f8c8d',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    paymentButton: {
        backgroundColor: '#27ae60',
        borderRadius: 12,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    paymentButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    paymentButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
        backgroundColor: '#ffcc1e',
    },
    webViewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
    },
    webViewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 30,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    successIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successIcon: {
        fontSize: 40,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 15,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        color: '#555',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
    },
    modalButton: {
        backgroundColor: '#27ae60',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

