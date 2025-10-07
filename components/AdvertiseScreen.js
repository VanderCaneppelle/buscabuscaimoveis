import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { PlanService } from '../lib/planService';
import { useFocusEffect } from '@react-navigation/native';


export default function AdvertiseScreen({ navigation }) {
    console.log('Rendered AdvertiseScreen');

    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [eligibility, setEligibility] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            checkUserPermissions();
        }
    }, [user?.id]);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                console.log('🔄 AdvertiseScreen: Atualizando dados...');
                checkUserPermissions();
            }
        }, [user?.id])
    );

    const checkUserPermissions = async () => {
        try {
            setLoading(true);
            const snapshot = await PlanService.getUserEligibility(user.id);
            setEligibility(snapshot);
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAd = () => {
        if (eligibility?.canCreate) {
            navigation.navigate('CreateAd');
        } else {
            Alert.alert(
                'Você não pode criar anúncios no momento.',
                eligibility?.reason || 'Você não pode criar anúncios no momento.',
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
        if (!eligibility) return null;

        const availableAds = Math.max(0, (eligibility.maxAds ?? 0) - (eligibility.currentAds ?? 0));
        const isExpired = eligibility.isExpired === true;
        const planDisplayName = isExpired
            ? `${eligibility.planDisplayName} (Vencido)`
            : (eligibility.planDisplayName || 'Gratuito');

        return (
            <View style={styles.planInfoCard}>
                <View style={styles.planInfoHeader}>
                    <Ionicons name="card" size={24} color={isExpired ? "#e74c3c" : "#3498db"} />
                    <Text style={styles.planInfoTitle}>Seu Plano Atual</Text>
                </View>
                <Text style={[styles.planName, isExpired && styles.planNameExpired]}>
                    {planDisplayName}
                </Text>
                {isExpired && eligibility?.endDate && (
                    <Text style={styles.planExpiredDate}>
                        Venceu em {new Date(eligibility.endDate).toLocaleDateString('pt-BR')}
                    </Text>
                )}
                <Text style={styles.planStatus}>
                    {eligibility.canCreate
                        ? `${eligibility.currentAds}/${eligibility.maxAds} anúncios ativos`
                        : eligibility.reason}
                </Text>

                {/* Botão para liberar mais anúncios quando disponível < 2 */}
                {availableAds < 2 && (
                    <View style={styles.upgradeSection}>
                        <Text style={styles.upgradeMessage}>
                            {availableAds === 0
                                ? '⚠️ Você não tem mais anúncios disponíveis! Não fique sem anunciar, renove seu plano.'
                                : '⚠️ Seu limite de anúncios esta quase esgotado! Não fique sem vender! Libere mais anúncios.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => handleViewPlans('gold')}
                        >
                            <Ionicons name="arrow-up-circle" size={16} color="#fff" />
                            <Text style={styles.upgradeButtonText}>Liberar Mais Anúncios</Text>
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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header Amarelo com Título */}
            <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Anunciar</Text>
                </View>
                <Text style={styles.headerSubtitle}>Publique seu imóvel</Text>
            </View>

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
                                'Anúncios Ativos',
                                eligibility?.currentAds || 0,
                                'home',
                                '#3498db'
                            )}
                            {renderStatsCard(
                                'Limite',
                                eligibility?.maxAds || 0,
                                'trending-up',
                                '#2ecc71'
                            )}
                            {renderStatsCard(
                                'Disponíveis',
                                Math.max(0, (eligibility?.maxAds || 0) - (eligibility?.currentAds || 0)),
                                'add-circle',
                                '#f39c12'
                            )}
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsSection}>
                        {/* <Text style={styles.sectionTitle}>Ações</Text> */}

                        {(() => {
                            const isDisabled = !eligibility?.canCreate;
                            console.log('🎯 Botão Criar Anúncio:', {
                                eligibility,
                                isDisabled,
                                currentAds: eligibility?.currentAds,
                                maxAds: eligibility?.maxAds
                            });
                            return renderActionCard(
                                'Criar Novo Anúncio',
                                'Publique um novo imóvel',
                                'add-circle',
                                '#3498db',
                                handleCreateAd,
                                isDisabled
                            );
                        })()}

                        {renderActionCard(
                            'Gerenciar Anúncios',
                            'Veja e edite seus anúncios',
                            'list',
                            '#2ecc71',
                            () => navigation.navigate('MyProperties')
                        )}

                        {renderActionCard(
                            'Ver Planos',
                            'Contrate ou altere seu plano',
                            'card',
                            '#f39c12',
                            handleViewPlans,
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    headerContainer: {
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 0,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    titleLogo: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00335e',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#00335e',
        textAlign: 'center',
        opacity: 0.8,
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
    upgradeSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
    },
    upgradeMessage: {
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