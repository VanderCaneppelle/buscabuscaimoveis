import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { BackendService } from '../lib/backendService';
import { PlanService } from '../lib/planService';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentScreen({ route, navigation }) {
    const { plan } = route.params;
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [loading, setLoading] = useState(false);
    const [paymentData, setPaymentData] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(false);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#000' : '#fff',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#333' : '#e0e0e0',
        },
        backButton: {
            marginRight: 16,
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#000',
        },
        content: {
            flex: 1,
            padding: 20,
        },
        planCard: {
            backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#e0e0e0',
        },
        planName: {
            fontSize: 24,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#000',
            marginBottom: 8,
        },
        planPrice: {
            fontSize: 32,
            fontWeight: 'bold',
            color: '#007AFF',
            marginBottom: 8,
        },
        planFeatures: {
            marginTop: 16,
        },
        featureItem: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        featureIcon: {
            marginRight: 8,
            color: '#4CAF50',
        },
        featureText: {
            fontSize: 16,
            color: isDark ? '#ccc' : '#666',
        },
        paymentButton: {
            backgroundColor: '#007AFF',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginTop: 20,
        },
        paymentButtonText: {
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
        },
        paymentButtonDisabled: {
            backgroundColor: '#ccc',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        statusContainer: {
            backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa',
            borderRadius: 12,
            padding: 20,
            marginTop: 20,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#e0e0e0',
        },
        statusTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#000',
            marginBottom: 8,
        },
        statusText: {
            fontSize: 16,
            color: isDark ? '#ccc' : '#666',
            marginBottom: 8,
        },
        checkStatusButton: {
            backgroundColor: '#4CAF50',
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            marginTop: 12,
        },
        checkStatusButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
        },
    });

    const handlePayment = async () => {
        if (!user) {
            Alert.alert('Erro', 'Usuário não autenticado');
            return;
        }

        setLoading(true);
        try {
            console.log('🚀 Iniciando processo de pagamento...');

            // Criar pagamento no backend
            const result = await BackendService.createPayment(plan, user);

            setPaymentData(result);
            console.log('✅ Pagamento criado:', result);

            // Abrir Mercado Pago no navegador
            const paymentUrl = result.preference.sandbox_init_point; // Usar sandbox para testes
            console.log('🔗 Abrindo URL de pagamento:', paymentUrl);

            const result_browser = await WebBrowser.openBrowserAsync(paymentUrl);

            console.log('🔙 Navegador fechado:', result_browser.type);

            // Sempre verificar status após o navegador fechar
            console.log('🔍 Verificando status após navegador fechar...');

            // Aguardar um pouco para o webhook processar
            setTimeout(async () => {
                await checkPaymentStatus();
            }, 2000);

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

    const checkPaymentStatus = async () => {
        if (!paymentData?.payment?.id) {
            Alert.alert('Erro', 'Dados de pagamento não encontrados');
            return;
        }

        setCheckingStatus(true);
        try {
            console.log('🔍 Verificando status do pagamento...');

            const statusResult = await BackendService.checkPaymentStatus(paymentData.payment.id);

            console.log('📊 Status do pagamento:', statusResult);

            if (statusResult.payment.status === 'approved') {
                Alert.alert(
                    'Pagamento Aprovado! 🎉',
                    'Seu plano foi ativado com sucesso!',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Atualizar dados do usuário
                                PlanService.loadUserInfo();
                                // Voltar para a tela anterior ou para Plans
                                if (route.params?.fromAdvertise) {
                                    navigation.navigate('CreateAd');
                                } else {
                                    navigation.navigate('Plans');
                                }
                            }
                        }
                    ]
                );
            } else if (statusResult.payment.status === 'pending') {
                Alert.alert(
                    'Pagamento Pendente',
                    'Seu pagamento está sendo processado. Você receberá uma notificação quando for aprovado.',
                    [{ text: 'OK' }]
                );
            } else if (statusResult.payment.status === 'rejected') {
                Alert.alert(
                    'Pagamento Rejeitado',
                    'Seu pagamento foi rejeitado. Tente novamente com outro método de pagamento.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Status do Pagamento',
                    `Status atual: ${statusResult.payment.status}`,
                    [{ text: 'OK' }]
                );
            }

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            Alert.alert(
                'Erro',
                'Não foi possível verificar o status do pagamento.',
                [{ text: 'OK' }]
            );
        } finally {
            setCheckingStatus(false);
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
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={[styles.statusText, { marginTop: 16 }]}>
                        Processando pagamento...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={isDark ? '#fff' : '#000'}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pagamento</Text>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.planCard}>
                    <Text style={styles.planName}>{plan.display_name}</Text>
                    <Text style={styles.planPrice}>
                        R$ {plan.price?.toFixed(2).replace('.', ',')}/mês
                    </Text>

                    <View style={styles.planFeatures}>
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

                <TouchableOpacity
                    style={[
                        styles.paymentButton,
                        loading && styles.paymentButtonDisabled
                    ]}
                    onPress={handlePayment}
                    disabled={loading}
                >
                    <Text style={styles.paymentButtonText}>
                        {loading ? 'Processando...' : 'Pagar com Mercado Pago'}
                    </Text>
                </TouchableOpacity>

                {paymentData && (
                    <View style={styles.statusContainer}>
                        <Text style={styles.statusTitle}>Status do Pagamento</Text>
                        <Text style={styles.statusText}>
                            ID: {paymentData.payment.id}
                        </Text>
                        <Text style={styles.statusText}>
                            Status: {paymentData.payment.status}
                        </Text>

                        <TouchableOpacity
                            style={styles.checkStatusButton}
                            onPress={checkPaymentStatus}
                            disabled={checkingStatus}
                        >
                            <Text style={styles.checkStatusButtonText}>
                                {checkingStatus ? 'Verificando...' : 'Verificar Status'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
} 