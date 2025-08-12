import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackendService from '../lib/backendService';
import { PlanService } from '../lib/planService';

import { PushNotificationService } from '../lib/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';

export default function PaymentConfirmationScreen({ route, navigation }) {
    const { paymentData, plan } = route.params;
    const { user } = useAuth();

    const [timeLeft, setTimeLeft] = useState(180); // 3 minutos
    const [status, setStatus] = useState('waiting'); // waiting, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [checkCount, setCheckCount] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    // Resetar estado quando a tela for montada
    useEffect(() => {
        setIsInitialized(false);
        setCheckCount(0);
        setStatus('waiting');
        setTimeLeft(180);
        setErrorMessage('');
    }, []);

    // Timer regressivo
    useEffect(() => {
        if (status === 'waiting' && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && status === 'waiting') {
            setStatus('error');
            setErrorMessage('Tempo limite excedido. O pagamento não foi confirmado.');
        }
    }, [timeLeft, status]);

    // Configurar polling e notificações - começa imediatamente
    useEffect(() => {
        console.log('🔄 useEffect de polling executado:', {
            status,
            hasPaymentData: !!paymentData?.payment?.id,
            isInitialized
        });

        if (status === 'waiting' && paymentData?.payment?.id && !isInitialized) {
            console.log('✅ Iniciando sistema de polling');
            console.log('🔍 Payment Data:', paymentData);
            console.log('🔍 Payment ID para polling:', paymentData.payment.id);
            setIsInitialized(true);

            // Solicitar permissões de notificação
            PushNotificationService.requestPermissions();

            // Fazer uma verificação inicial
            const checkInitialStatus = async () => {
                try {
                    console.log('🔍 Verificação inicial do status...');
                    console.log('🔍 Payment ID:', paymentData.payment.id);

                    const statusResult = await BackendService.checkPaymentStatus(paymentData.payment.id);
                    console.log('📊 Status inicial:', statusResult);

                    if (statusResult.payment.status === 'approved') {
                        console.log('✅ Pagamento já estava aprovado!');
                        setStatus('success');
                        PlanService.loadUserInfo();

                        // Enviar notificação local
                        PushNotificationService.sendLocalNotification(
                            'Pagamento Aprovado! 🎉',
                            'Seu pagamento foi confirmado com sucesso!'
                        );
                    } else if (statusResult.payment.status === 'rejected') {
                        console.log('❌ Pagamento já estava rejeitado!');
                        setStatus('error');
                        setErrorMessage('Pagamento rejeitado. Tente novamente com outro método de pagamento.');
                    } else {
                        console.log('⏳ Pagamento ainda pendente, iniciando polling...');
                    }
                } catch (error) {
                    console.error('❌ Erro na verificação inicial:', error);
                }
            };

            checkInitialStatus();
        }
    }, [paymentData, isInitialized]);

    // Polling a cada 10 segundos
    useEffect(() => {
        if (status === 'waiting' && paymentData?.payment?.id) {
            console.log('⏰ Iniciando polling a cada 10 segundos...');

            const interval = setInterval(async () => {
                try {
                    console.log('🔍 Verificando status do pagamento...');
                    const statusResult = await BackendService.checkPaymentStatus(paymentData.payment.id);
                    console.log('📊 Status atual:', statusResult);

                    if (statusResult.payment.status === 'approved') {
                        console.log('✅ Pagamento aprovado via polling!');
                        setStatus('success');
                        // Atualizar informações do usuário
                        try {
                            await PlanService.getUserPlanInfo(user.id);
                        } catch (error) {
                            console.error('❌ Erro ao atualizar informações do usuário:', error);
                        }

                        // Enviar notificação local
                        PushNotificationService.sendLocalNotification(
                            'Pagamento Aprovado! 🎉',
                            'Seu pagamento foi confirmado com sucesso!'
                        );

                        // Parar o polling
                        clearInterval(interval);
                    } else if (statusResult.payment.status === 'rejected') {
                        console.log('❌ Pagamento rejeitado via polling!');
                        setStatus('error');
                        setErrorMessage('Pagamento rejeitado. Tente novamente com outro método de pagamento.');

                        // Parar o polling
                        clearInterval(interval);
                    } else {
                        console.log('⏳ Pagamento ainda pendente, continuando polling...');
                    }
                } catch (error) {
                    console.error('❌ Erro no polling:', error);
                }
            }, 10000); // 10 segundos

            // Cleanup: parar o polling quando o componente for desmontado ou status mudar
            return () => {
                console.log('🧹 Parando polling');
                clearInterval(interval);
            };
        }
    }, [status, paymentData]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnunciar = () => {
        navigation.navigate('CreateAd');
    };

    const handleVerImoveis = () => {
        navigation.navigate('Main', { screen: 'Busca' });
    };

    const handleTentarNovamente = () => {
        navigation.goBack();
    };

    const renderWaitingContent = () => (
        <>
            {/* Info Card Verde */}
            <View style={styles.infoCard}>
                <Ionicons name="time" size={24} color="#27ae60" />
                <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>Aguardando Confirmação</Text>
                    <Text style={styles.infoText}>
                        Seu pagamento foi processado e está sendo confirmado.
                        <Text style={styles.importantText}> Não saia desta tela!</Text>
                    </Text>
                </View>
            </View>

            {/* Timer Card */}
            <View style={styles.timerCard}>
                <View style={styles.timerHeader}>
                    <Ionicons name="hourglass" size={32} color="#27ae60" />
                    <Text style={styles.timerTitle}>Tempo Restante</Text>
                </View>
                <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                <Text style={styles.timerSubtitle}>Aguarde a confirmação automática</Text>
            </View>

            {/* Status Card */}
            <View style={styles.statusCard}>
                <View style={styles.statusHeader}>
                    <Ionicons name="refresh" size={20} color="#27ae60" />
                    <Text style={styles.statusTitle}>Status da Verificação</Text>
                </View>
                <View style={styles.statusDetails}>
                    <Text style={styles.statusText}>
                        Status: <Text style={styles.statusHighlight}>Aguardando confirmação</Text>
                    </Text>
                    <Text style={styles.statusText}>
                        Verificação: <Text style={styles.statusHighlight}>A cada 10 segundos</Text>
                    </Text>
                </View>
                <ActivityIndicator size="small" color="#27ae60" style={styles.loadingIndicator} />
            </View>

            {/* Warning Card */}
            <View style={styles.warningCard}>
                <Ionicons name="warning" size={20} color="#f39c12" />
                <Text style={styles.warningText}>
                    Importante: Mantenha esta tela aberta até a confirmação do pagamento
                </Text>
            </View>
        </>
    );

    const renderSuccessContent = () => (
        <>
            {/* Success Card */}
            <View style={styles.successCard}>
                <View style={styles.successHeader}>
                    <Ionicons name="checkmark-circle" size={48} color="#27ae60" />
                    <Text style={styles.successTitle}>Pagamento Aprovado!</Text>
                </View>
                <Text style={styles.successText}>
                    Seu plano <Text style={styles.planHighlight}>{plan.display_name}</Text> foi ativado com sucesso!
                </Text>
                <Text style={styles.successSubtext}>
                    Agora você pode criar anúncios e aproveitar todos os benefícios.
                </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleAnunciar}>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Criar Anúncio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleVerImoveis}>
                    <Ionicons name="home-outline" size={20} color="#27ae60" />
                    <Text style={styles.secondaryButtonText}>Ver Imóveis</Text>
                </TouchableOpacity>
            </View>
        </>
    );

    const renderErrorContent = () => (
        <>
            {/* Error Card */}
            <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                    <Ionicons name="close-circle" size={48} color="#e74c3c" />
                    <Text style={styles.errorTitle}>Pagamento Não Confirmado</Text>
                </View>
                <Text style={styles.errorText}>{errorMessage}</Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleTentarNovamente}>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#2c3e50" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {status === 'waiting' ? 'Confirmação de Pagamento' :
                        status === 'success' ? 'Pagamento Aprovado' : 'Erro no Pagamento'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {status === 'waiting' && renderWaitingContent()}
                {status === 'success' && renderSuccessContent()}
                {status === 'error' && renderErrorContent()}
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
    infoCard: {
        backgroundColor: '#e8f8f5',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderLeftWidth: 4,
        borderLeftColor: '#27ae60',
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
    importantText: {
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    timerCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    timerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginLeft: 8,
    },
    timerValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 8,
    },
    timerSubtitle: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    statusCard: {
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
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginLeft: 8,
    },
    statusDetails: {
        marginBottom: 16,
    },
    statusText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    statusHighlight: {
        fontWeight: 'bold',
        color: '#27ae60',
    },
    loadingIndicator: {
        alignSelf: 'center',
    },
    warningCard: {
        backgroundColor: '#fff3cd',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: '#f39c12',
    },
    warningText: {
        fontSize: 14,
        color: '#856404',
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    successCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    successHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#27ae60',
        marginTop: 8,
    },
    successText: {
        fontSize: 16,
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    planHighlight: {
        fontWeight: 'bold',
        color: '#27ae60',
    },
    successSubtext: {
        fontSize: 14,
        color: '#7f8c8d',
        textAlign: 'center',
        lineHeight: 20,
    },
    errorCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    errorHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#e74c3c',
        marginTop: 8,
    },
    errorText: {
        fontSize: 16,
        color: '#2c3e50',
        textAlign: 'center',
        lineHeight: 22,
    },
    actionButtons: {
        marginHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#27ae60',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    secondaryButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#27ae60',
    },
    secondaryButtonText: {
        color: '#27ae60',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
}); 