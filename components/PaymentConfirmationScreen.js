import React, { useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import StandardHeader from './StandardHeader';

export default function PaymentConfirmationScreen({ route, navigation }) {
    console.log('Rendered PaymentConfirmationScreen');

    const { plan } = route.params;
    const { user } = useAuth();

    const [status] = useState('success');

    const handleAnunciar = () => {
        navigation.navigate('CreateAd');
    };

    const handleVerImoveis = () => {
        navigation.navigate('Main', {
            screen: 'MainTabs',
            params: {
                screen: 'Busca'
            }
        });
    };

    const handleTentarNovamente = () => {
        navigation.goBack();
    };

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

    return (
        <SafeAreaView style={styles.container}>
            <StandardHeader
                title="Pagamento Aprovado"
                subtitle="Seu pagamento foi aprovado com sucesso"
                showBackButton={false}
                onBackPress={() => navigation.goBack()}
            />

            <View style={styles.contentContainer}>
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {renderSuccessContent()}
                </ScrollView>
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
        paddingTop: 15,
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