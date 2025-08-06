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
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#e0e0e0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
        },
        planHeader: {
            alignItems: 'center',
            marginBottom: 20,
        },
        planName: {
            fontSize: 28,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#000',
            marginBottom: 8,
            textAlign: 'center',
        },
        planPrice: {
            fontSize: 36,
            fontWeight: 'bold',
            color: '#007AFF',
            marginBottom: 4,
        },
        planPeriod: {
            fontSize: 16,
            color: isDark ? '#ccc' : '#666',
            marginBottom: 16,
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
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            marginTop: 20,
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
        },
        paymentButtonText: {
            color: '#fff',
            fontSize: 20,
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

            // Redirecionar imediatamente para a tela de confirmação
            // O timer só vai começar quando chegar na tela de confirmação
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
                    <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.display_name}</Text>
                        <Text style={styles.planPrice}>
                            R$ {plan.price?.toFixed(2).replace('.', ',')}
                        </Text>
                        <Text style={styles.planPeriod}>por mês</Text>
                    </View>

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


            </ScrollView>
        </SafeAreaView>
    );
} 