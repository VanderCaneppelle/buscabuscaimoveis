import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useUserPlanStore } from '../stores/userPlanStore';
import { useFocusEffect } from '@react-navigation/native';
import StandardHeader from './StandardHeader';


export default function AdvertiseScreen({ navigation }) {
    console.log('Rendered AdvertiseScreen');

    const { user } = useAuth();

    // ✅ Zustand: User Plan Store
    const canCreateAd = useUserPlanStore(state => state.canCreateAd);
    const canManageAds = useUserPlanStore(state => state.canManageAds);
    const canBoostAd = useUserPlanStore(state => state.canBoostAd);
    const createAdReason = useUserPlanStore(state => state.createAdReason);
    const manageAdsReason = useUserPlanStore(state => state.manageAdsReason);
    const boostAdReason = useUserPlanStore(state => state.boostAdReason);
    const planName = useUserPlanStore(state => state.plan?.display_name);
    const currentAds = useUserPlanStore(state => state.currentAds);
    const maxAds = useUserPlanStore(state => state.maxAds);
    const availableAds = useUserPlanStore(state => state.availableAds);
    const isFreePlan = useUserPlanStore(state => state.isFreePlan);
    const isPlanExpired = useUserPlanStore(state => state.isPlanExpired);
    const planEndDate = useUserPlanStore(state => state.planEndDate);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
    const loading = useUserPlanStore(state => state.loading);

    useEffect(() => {
        if (user?.id) {
            fetchUserPlanData(user.id); // Cache de 3 min
        }
    }, [user?.id]);

    // 🔍 Debug: Verificar todos os valores do Zustand
    useEffect(() => {
        console.log('🔍 AdvertiseScreen - Valores do Zustand:', {
            planName,
            currentAds,
            maxAds,
            availableAds,
            isFreePlan,
            isPlanExpired,
            canCreateAd,
            canManageAds,
            canBoostAd,
            createAdReason,
            manageAdsReason,
            boostAdReason
        });
    }, [planName, currentAds, maxAds, availableAds, isFreePlan, isPlanExpired,
        canCreateAd, canManageAds, canBoostAd]);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                console.log('🔄 AdvertiseScreen: Atualizando dados...');
                fetchUserPlanData(user.id);
            }
        }, [user?.id])
    );

    const handleCreateAd = () => {
        if (canCreateAd) {
            navigation.navigate('CreateAd');
        } else {
            Alert.alert(
                'Você não pode criar anúncios no momento.',
                createAdReason || 'Você não pode criar anúncios no momento.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Planos', onPress: () => navigation.navigate('Plans') }
                ]
            );
        }
    };

    const handleManageAds = () => {
        if (canManageAds) {
            navigation.navigate('MyProperties');
        } else {
            Alert.alert(
                'Não é possível gerenciar anúncios',
                manageAdsReason || 'Você precisa de um plano ativo para gerenciar anúncios.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Planos', onPress: () => navigation.navigate('Plans') }
                ]
            );
        }
    };

    const handleBoostAds = () => {
        if (canBoostAd) {
            navigation.navigate('AdBoosting');
        } else {
            Alert.alert(
                'Você não pode impulsionar anúncios no momento.',
                boostAdReason || 'Você não pode impulsionar anúncios no momento.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Planos', onPress: () => navigation.navigate('Plans') }
                ]
            );
        }
    };
    const handleViewPlans = (highlightPlan = null) => {
        navigation.navigate('Plans', { highlightPlan });
    };

    const renderPlanInfoCard = () => {
        // ✅ Usar valores já selecionados no topo do componente
        const planDisplayName = isPlanExpired
            ? `${planName} (Vencido)`
            : (planName || 'Gratuito');

        return (
            <View style={styles.planInfoCard}>
                <View style={styles.planInfoHeader}>
                    <Ionicons name="card" size={24} color={isPlanExpired ? "#e74c3c" : "#3498db"} />
                    <Text style={styles.planInfoTitle}>Seu Plano Atual</Text>
                </View>
                <Text style={[styles.planName, isPlanExpired && styles.planNameExpired]}>
                    {planDisplayName}
                </Text>
                {isPlanExpired && planEndDate && (
                    <Text style={styles.planExpiredDate}>
                        Venceu em {new Date(planEndDate).toLocaleDateString('pt-BR')}
                    </Text>
                )}
                <Text style={styles.planStatus}>
                    {canCreateAd
                        ? `${currentAds}/${maxAds} anúncios ativos`
                        : createAdReason}
                </Text>

                {/* Aviso de Plano Vencido */}
                {isPlanExpired && (
                    <View style={styles.expiredWarning}>
                        <View style={styles.expiredWarningHeader}>
                            <Ionicons name="warning" size={20} color="#e74c3c" />
                            <Text style={styles.expiredWarningTitle}>Atenção: Plano Vencido</Text>
                        </View>
                        <Text style={styles.expiredWarningText}>
                            Seus anúncios permanecerão inativos por até 24 horas.
                            {'\n'}
                            Caso o plano não seja renovado, eles serão permanentemente excluídos.
                        </Text>
                        <TouchableOpacity
                            style={styles.renewButton}
                            onPress={() => navigation.navigate('Plans')}
                        >
                            <Ionicons name="refresh" size={16} color="#fff" />
                            <Text style={styles.renewButtonText}>Renovar Plano Agora</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Botão para liberar mais anúncios quando disponível < 2 */}
                {!isPlanExpired && availableAds < 2 && (
                    <View style={styles.upgradeSection}>
                        <Text style={styles.upgradeMessage}>
                            {isFreePlan ? 'Contrate um plano e comece a anunciar.' :
                                availableAds === 0
                                    ? '⚠️ Você não tem mais anúncios disponíveis! Não fique sem anunciar, renove seu plano.'
                                    : '⚠️ Seu limite de anúncios esta quase esgotado! Não fique sem vender! Libere mais anúncios.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => handleViewPlans('gold')}
                        >
                            <Ionicons name="arrow-up-circle" size={16} color="#fff" />

                            <Text style={styles.upgradeButtonText}>{planDisplayName === 'Gratuito' ? 'Contratar Plano' : 'Liberar Mais Anúncios'}</Text>

                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderActionCard = (title, description, icon, color, onPress, disabled = false) => (
        <TouchableOpacity
            style={[styles.actionCard, disabled && styles.actionCardDisabled]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={[styles.actionIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={32} color="#fff" />
            </View>
            <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{title}</Text>
                <Text style={styles.actionDescription}>{description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7f8c8d" />
        </TouchableOpacity>
    );

    const renderStatsCard = (title, value, icon, color) => (
        <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#fff" />
            </View>
            <View style={styles.statsContent}>
                <Text style={styles.statsValue}>{value}</Text>
                <Text style={styles.statsTitle}>{title}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Padrão */}
            <StandardHeader
                title="Anunciar"
                subtitle="Publique seu imóvel"
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Plan Info */}
                    {renderPlanInfoCard()}
                    <View style={styles.statsSection}>

                        {/* Quick Stats */}
                        <Text style={styles.sectionTitle}>Resumo</Text>
                        <View style={styles.statsGrid}>
                            {renderStatsCard(
                                'Anúncios',
                                currentAds,
                                'home',
                                '#3498db'
                            )}
                            {renderStatsCard(
                                'Limite',
                                maxAds,
                                'trending-up',
                                '#2ecc71'
                            )}
                            {renderStatsCard(
                                'Disponíveis',
                                availableAds,
                                'add-circle',
                                '#f39c12'
                            )}
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsSection}>
                        {/* <Text style={styles.sectionTitle}>Ações</Text> */}

                        {renderActionCard(
                            'Criar Novo Anúncio',
                            'Publique um novo imóvel',
                            'add-circle',
                            '#3498db',
                            handleCreateAd,
                            !canCreateAd
                        )}

                        {renderActionCard(
                            'Gerenciar Anúncios',
                            'Veja e edite seus anúncios',
                            'list',
                            '#2ecc71',
                            handleManageAds,
                            !canManageAds
                        )}

                        {renderActionCard(
                            'Impulsionar Anúncios',
                            'Dê mais visibilidade aos seus anúncios',
                            'rocket',
                            '#e67e22',
                            handleBoostAds,
                            !canBoostAd
                        )}

                        {renderActionCard(
                            'Ver Planos',
                            'Contrate ou altere seu plano',
                            'card',
                            '#f39c12',
                            () => handleViewPlans(),
                            false
                        )}

                        {/* {renderActionCard(
                            'Relatórios',
                            'Acompanhe o desempenho',
                            'analytics',
                            '#9b59b6',
                            () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
                            false
                        )} */}
                    </View>

                    {/* Tips */}
                    <View style={styles.tipsSection}>
                        <Text style={styles.sectionTitle}>Dicas</Text>
                        <View style={styles.tipCard}>
                            <Ionicons name="bulb" size={20} color="#f39c12" />
                            <Text style={styles.tipText}>
                                Adicione fotos de qualidade para aumentar as visualizações do seu anúncio
                            </Text>
                        </View>
                        <View style={styles.tipCard}>
                            <Ionicons name="time" size={20} color="#3498db" />
                            <Text style={styles.tipText}>
                                Mantenha seus anúncios sempre atualizados com informações precisas
                            </Text>
                        </View>
                        <View style={styles.tipCard}>
                            <Ionicons name="star" size={20} color="#e74c3c" />
                            <Text style={styles.tipText}>
                                Responda rapidamente aos interessados para aumentar as chances de venda
                            </Text>
                        </View>
                    </View>
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
    planInfoCard: {
        backgroundColor: '#fff',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    planInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    planInfoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00335e',
        marginLeft: 10,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 5,
    },
    planNameExpired: {
        color: '#e74c3c',
    },
    planExpiredDate: {
        fontSize: 12,
        color: '#e74c3c',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    planStatus: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    // Aviso de Plano Vencido
    expiredWarning: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        backgroundColor: '#fee',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#f5c6cb',
    },
    expiredWarningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    expiredWarningTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#e74c3c',
    },
    expiredWarningText: {
        fontSize: 13,
        color: '#721c24',
        lineHeight: 20,
        marginBottom: 12,
    },
    renewButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    renewButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    // Seção de Upgrade
    upgradeSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    upgradeMessage: {
        fontWeight: '600',
        fontStyle: 'italic',
        fontSize: 13,
        color: '#856404',
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 18,
    },
    upgradeButton: {
        backgroundColor: '#f39c12',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    statsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 15,
        paddingHorizontal: 20,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
    },
    statsCard: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    statsIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        opacity: 0.8,
    },
    statsValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
        textAlign: 'center',
    },
    statsTitle: {
        fontSize: 11,
        color: '#7f8c8d',
        textAlign: 'center',
        fontWeight: '400',
    },
    statsContent: {
        alignItems: 'center',
    },
    actionsSection: {
        marginBottom: 20,
    },
    actionCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    actionCardDisabled: {
        opacity: 0.6,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    tipsSection: {
        marginBottom: 20,
    },
    tipCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 10,
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    tipText: {
        fontSize: 14,
        color: '#2c3e50',
        marginLeft: 10,
        flex: 1,
        lineHeight: 20,
    },
}); 