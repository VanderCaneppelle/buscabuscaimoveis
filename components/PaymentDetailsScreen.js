import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { BackendService } from '../lib/backendService';
import { PushNotificationService } from '../lib/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase.js';
export default function PaymentDetailsScreen({ route, navigation }) {
    const { plan } = route.params;
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);

    async function checkDowngradePossibility(userId, newPlanId) {
        try {
            console.log('🔍 Verificando possibilidade de downgrade - FORA DO BACKEND...');

            // Buscar o novo plano
            const { data: newPlan, error: planError } = await supabase
                .from('plans')
                .select('*')
                .eq('id', newPlanId)
                .single();
            console.log('🔍 Novo plano (create.js):', newPlan);

            if (planError || !newPlan) {
                console.error('❌ Erro ao buscar novo plano:', planError);
                return { canDowngrade: false, message: 'Plano não encontrado' };
            }

            // Buscar anúncios ativos do usuário
            const { data: activeAds, error: adsError } = await supabase
                .from('properties')
                .select('*')
                .eq('user_id', userId)
                .in('status', ['approved', 'pending', 'active'])
                .order('created_at', { ascending: false });

            if (adsError) {
                console.error('❌ Erro ao buscar anúncios:', adsError);
                return { canDowngrade: false, message: 'Erro ao verificar anúncios' };
            }

            const currentAdsCount = activeAds?.length || 0;
            const newPlanLimit = newPlan.max_ads ?? Infinity;

            console.log(`📊 Anúncios atuais: ${currentAdsCount}, Limite do novo plano: ${newPlanLimit}`);

            if (currentAdsCount > newPlanLimit) {
                const adsToDeactivate = currentAdsCount - newPlanLimit;
                const message = `Você tem ${currentAdsCount} anúncios ativos, mas o plano ${newPlan.display_name} permite apenas ${newPlanLimit}. Você precisa desativar ${adsToDeactivate} anúncio(s) antes de fazer o downgrade.`;

                console.log(`❌ Downgrade bloqueado: ${message}`);
                return {
                    canDowngrade: false,
                    message,
                    currentAds: currentAdsCount,
                    newPlanLimit,
                    adsToDeactivate
                };
            } else {
                console.log('✅ Downgrade permitido - anúncios dentro do limite');
                return { canDowngrade: true, message: 'Downgrade permitido' };
            }
        } catch (error) {
            console.error('❌ Erro na verificação de downgrade:', error);
            return { canDowngrade: false, message: 'Erro interno na verificação' };
        }
    }


    const handlePayment = async () => {
        if (!user) {
            Alert.alert('Erro', 'Usuário não autenticado');
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Iniciando processo de pagamento...');

            // Configurar notificações locais
            await PushNotificationService.requestPermissions();

            //check downgrade possibility
            const downgradeCheck = await checkDowngradePossibility(user.id, plan.id);
            if (!downgradeCheck.canDowngrade) {
                Alert.alert('Erro', downgradeCheck.message);
                return;
            }

            // Criar pagamento no backend
            const result = await BackendService.createPayment(plan, user);
            console.log('✅ Pagamento criado:', result);

            // Polling será ativado na PaymentConfirmationScreen
            console.log('🚀 Polling será ativado na tela de confirmação');

            // Abrir Mercado Pago no navegador
            const paymentUrl = result.preference.sandbox_init_point;
            console.log('🔗 Abrindo URL de pagamento:', paymentUrl);

            const result_browser = await WebBrowser.openBrowserAsync(paymentUrl);
            console.log('🔙 Navegador fechado:', result_browser.type);

            // Redirecionar para a tela de confirmação
            navigation.navigate('PaymentConfirmation', {
                paymentData: result,
                plan: plan
            });

        } catch (error) {
            console.error('❌ Erro no pagamento:', error);
            Alert.alert(
                'Erro',
                'Não foi possível processar o pagamento. Tente novamente.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const getPlanFeatures = () => {
        switch (plan.name) {
            case 'premium':
                return [
                    'Anúncios ilimitados',
                    'Destaque nos resultados',
                    'Estatísticas avançadas',
                    'Suporte prioritário'
                ];
            case 'basic':
                return [
                    'Até 5 anúncios',
                    'Destaque básico',
                    'Estatísticas básicas'
                ];
            default:
                return [];
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalhes do Pagamento</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="card" size={24} color="#3498db" />
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Pagamento Seguro</Text>
                        <Text style={styles.infoText}>
                            Seu pagamento será processado pelo Mercado Pago, garantindo total segurança.
                        </Text>
                    </View>
                </View>

                {/* Plan Card */}
                <View style={styles.planCard}>
                    <View style={styles.planHeader}>
                        <Ionicons name="star" size={24} color="#f39c12" />
                        <Text style={styles.planName}>{plan.display_name}</Text>
                    </View>

                    <View style={styles.priceSection}>
                        <Text style={styles.priceValue}>
                            R$ {plan.price?.toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={styles.pricePeriod}>por mês</Text>
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

                {/* Security Info */}
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
                </View>

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