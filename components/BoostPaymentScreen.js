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
import { useBoostsStore } from '../stores/boostsStore';
import StandardHeader from './StandardHeader';

export default function BoostPaymentScreen({ navigation, route }) {
    console.log('Rendered BoostPaymentScreen');

    const { property, boostPlan } = route.params;
    const { user } = useAuth();

    // Zustand: Boosts
    const addBoost = useBoostsStore(state => state.addBoost);
    const invalidateCache = useBoostsStore(state => state.invalidateCache);

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
            // Priorizar init_point (produção) e só usar sandbox se não existir init_point
            const paymentUrl = result?.preference?.init_point || result?.preference?.sandbox_init_point;
            console.log('🔗 URLs disponíveis:', {
                init_point: result?.preference?.init_point ? '✅ Presente' : '❌ Ausente',
                sandbox_init_point: result?.preference?.sandbox_init_point ? '✅ Presente' : '❌ Ausente',
                url_usada: paymentUrl
            });
            console.log('🔗 Abrindo URL no WebView:', paymentUrl);

            if (!paymentUrl) {
                throw new Error('URL de checkout não encontrada na preferência');
            }

            // Validar que a URL é válida antes de abrir
            if (!paymentUrl.startsWith('http://') && !paymentUrl.startsWith('https://')) {
                throw new Error('URL de checkout inválida');
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
        navigation.goBack();
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

                        // ✅ Atualização otimista: adicionar boost ao store imediatamente
                        console.log('✨ Adicionando boost ao store (otimista):', property.id);
                        addBoost(property.id);
                        invalidateCache(); // Forçar próxima busca do servidor

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
            <StandardHeader
                title="Confira os detalhes"
                subtitle="Confirme o pagamento do impulso"
                showBackButton={true}
                onBackPress={() => navigation.goBack()}
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Recibo Header */}
                    <View style={styles.receiptHeader}>
                        <View style={styles.stampContainer}>
                            <Ionicons name="receipt-outline" size={24} color="#00335e" />
                        </View>
                        <Text style={styles.receiptTitle}>Comprovante de Impulsionamento</Text>
                        <Text style={styles.receiptDate}>
                            {new Date().toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>

                    {/* Recibo Principal */}
                    <View style={styles.receiptBody}>
                        {/* Seção Imóvel */}
                        <View style={styles.receiptSection}>
                            <Text style={styles.sectionTitle}>IMÓVEL</Text>
                            <View style={styles.propertyDetailsOnly}>
                                <Text style={styles.propertyTitle} numberOfLines={2}>
                                    {property.title}
                                </Text>
                                <Text style={styles.propertyLocation}>
                                    {property.city}, {property.state}
                                </Text>
                                <Text style={styles.propertyId}>
                                    ID: {property.id.substring(0, 8).toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.dottedDivider} />

                        {/* Seção Serviço */}
                        <View style={styles.receiptSection}>
                            <Text style={styles.sectionTitle}>SERVIÇO CONTRATADO</Text>
                            <View style={styles.serviceRow}>
                                <View style={styles.serviceIcon}>
                                    <Ionicons name="rocket" size={20} color="#fff" />
                                </View>
                                <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceName}>Impulsionamento Premium</Text>
                                    <Text style={styles.serviceDuration}>
                                        {boostPlan.duration_days === 1 ? '1 dia' : `${boostPlan.duration_days} dias`} de destaque
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.dottedDivider} />

                        {/* Seção Detalhes */}
                        <View style={styles.receiptSection}>
                            <Text style={styles.sectionTitle}>DETALHES</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Início do Impulsionamento:</Text>
                                <Text style={styles.detailValue}>Após aprovação do pagamento</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Visibilidade:</Text>
                                <Text style={styles.detailValue}>Seção "Destaques"</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Alcance estimado:</Text>
                                <Text style={styles.detailValue}>Até 10x mais visualizações</Text>
                            </View>
                        </View>

                        <View style={styles.solidDivider} />

                        {/* Seção Pagamento */}
                        <View style={styles.receiptSection}>
                            <Text style={styles.sectionTitle}>FORMA DE PAGAMENTO</Text>
                            <View style={styles.paymentRow}>
                                <Ionicons name="card" size={24} color="#27ae60" />
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentMethod}>Mercado Pago</Text>
                                    <Text style={styles.paymentSubtext}>
                                        Pix, Cartão, Boleto e mais opções
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.receiptFooter}>
                                <Ionicons name="shield-checkmark" size={18} color="#27ae60" />
                                <Text style={styles.footerText}>
                                    Transação 100% segura via Mercado Pago
                                </Text>
                            </View>
                        </View>

                        <View style={styles.solidDivider} />

                        {/* Seção Total */}
                        <View style={styles.totalSection}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Subtotal</Text>
                                <Text style={styles.totalValue}>
                                    R$ {boostPlan.price.toFixed(2).replace('.', ',')}
                                </Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Taxas</Text>
                                <Text style={styles.totalValue}>R$ 0,00</Text>
                            </View>
                            <View style={styles.grandTotalRow}>
                                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                                <Text style={styles.grandTotalValue}>
                                    R$ {boostPlan.price.toFixed(2).replace('.', ',')}
                                </Text>
                            </View>
                        </View>
                    </View>



                </ScrollView>

                {/* Payment Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <View style={styles.paymentButtonContent}>
                                <Ionicons name="card" size={20} color="#fff" />
                                <Text style={styles.paymentButtonText}>
                                    Confirmar e Pagar
                                </Text>
                            </View>
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
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                            sharedCookiesEnabled={true}
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
                    // Resetar a pilha e ir para a tab "Busca" (que contém a Home)
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Busca' }],
                    });
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
                                // Resetar a pilha e ir para a tab "Busca" (que contém a Home)
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: 'Busca' }],
                                });
                            }}
                        >
                            <Text style={styles.modalButtonText}>Ir para Início</Text>
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

    placeholder: {
        width: 40,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    content: {
        flex: 1,
    },
    // Receipt Header Styles
    receiptHeader: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        marginTop: 15,
        marginHorizontal: 15,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#e9ecef',
    },
    stampContainer: {
        width: 40,
        height: 40,
        borderRadius: 25,
        backgroundColor: '#ffcc1e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 3,
        borderColor: '#00335e',
    },
    receiptTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 5,
        textAlign: 'center',
    },
    receiptDate: {
        fontSize: 12,
        color: '#7f8c8d',
        textTransform: 'capitalize',
    },
    // Receipt Body Styles
    receiptBody: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 10,
    },
    receiptSection: {
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#95a5a6',
        letterSpacing: 1,
        marginBottom: 8,
    },
    // Property Section
    propertyDetailsOnly: {
        flex: 1,
    },
    propertyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    propertyLocation: {
        fontSize: 13,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    propertyId: {
        fontSize: 11,
        color: '#95a5a6',
        fontFamily: 'monospace',
    },
    // Service Section
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    serviceIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6c5ce7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    serviceDuration: {
        fontSize: 13,
        color: '#7f8c8d',
    },
    // Detail Section
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
        paddingVertical: 2,
    },
    detailLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        flex: 1,
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '500',
        color: '#2c3e50',
        textAlign: 'right',
        flex: 1,
    },
    // Payment Section
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    paymentInfo: {
        flex: 1,
    },
    paymentMethod: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    paymentSubtext: {
        fontSize: 12,
        color: '#7f8c8d',
    },
    // Total Section
    totalSection: {
        paddingTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    totalLabel: {
        fontSize: 13,
        color: '#7f8c8d',
    },
    totalValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#2c3e50',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        marginTop: 6,
        borderTopWidth: 2,
        borderTopColor: '#00335e',
    },
    grandTotalLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#00335e',
    },
    grandTotalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00335e',
    },
    // Dividers
    dottedDivider: {
        height: 1,
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
    },
    solidDivider: {
        height: 1,
        backgroundColor: '#e9ecef',
    },
    // Footer
    receiptFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#f0fdf4',
        borderTopWidth: 1,
        borderTopColor: '#86efac',
    },
    footerText: {
        fontSize: 11,
        color: '#166534',
        fontWeight: '500',
    },
    // Payment Button
    footer: {
        backgroundColor: '#fff',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    paymentButton: {
        backgroundColor: '#27ae60',
        borderRadius: 8,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    paymentButtonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    paymentButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paymentButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    paymentButtonSubtext: {
        color: '#fff',
        fontSize: 12,
        marginTop: 1,
        opacity: 0.9,
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

