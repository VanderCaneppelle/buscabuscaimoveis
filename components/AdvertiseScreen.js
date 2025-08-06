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
import { PlanService } from '../lib/planService';
import { useFocusEffect } from '@react-navigation/native';

export default function AdvertiseScreen({ navigation }) {
    const { user } = useAuth();
    const [userPlanInfo, setUserPlanInfo] = useState(null);
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
            const planInfo = await PlanService.getUserPlanInfo(user.id);
            setUserPlanInfo(planInfo);
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAd = () => {
        if (userPlanInfo?.canCreate.can_create) {
            navigation.navigate('CreateAd');
        } else {
            Alert.alert(
                'Plano Necessário',
                userPlanInfo?.canCreate.reason || 'Você precisa de um plano ativo para criar anúncios.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Ver Planos', onPress: () => navigation.navigate('Plans') }
                ]
            );
        }
    };

    const handleViewPlans = () => {
        navigation.navigate('Plans');
    };

    const renderPlanInfoCard = () => {
        if (!userPlanInfo) return null;

        const { plan, canCreate } = userPlanInfo;

        return (
            <View style={styles.planInfoCard}>
                <View style={styles.planInfoHeader}>
                    <Ionicons name="card" size={24} color="#3498db" />
                    <Text style={styles.planInfoTitle}>Seu Plano Atual</Text>
                </View>
                <Text style={styles.planName}>{plan?.display_name || 'Gratuito'}</Text>
                <Text style={styles.planStatus}>
                    {canCreate.can_create
                        ? `${canCreate.current_ads}/${canCreate.max_ads} anúncios ativos`
                        : canCreate.reason
                    }
                </Text>
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
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Anunciar</Text>
                <Text style={styles.headerSubtitle}>Gerencie seus anúncios</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Plan Info */}
                {renderPlanInfoCard()}

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Resumo</Text>
                    <View style={styles.statsGrid}>
                        {renderStatsCard(
                            'Anúncios Ativos',
                            userPlanInfo?.canCreate.current_ads || 0,
                            'home',
                            '#3498db'
                        )}
                        {renderStatsCard(
                            'Limite',
                            userPlanInfo?.canCreate.max_ads || 0,
                            'trending-up',
                            '#2ecc71'
                        )}
                        {renderStatsCard(
                            'Disponíveis',
                            Math.max(0, (userPlanInfo?.canCreate.max_ads || 0) - (userPlanInfo?.canCreate.current_ads || 0)),
                            'add-circle',
                            '#f39c12'
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Ações</Text>

                    {renderActionCard(
                        'Criar Novo Anúncio',
                        'Publique um novo imóvel',
                        'add-circle',
                        '#3498db',
                        handleCreateAd,
                        !userPlanInfo?.canCreate.can_create
                    )}

                    {renderActionCard(
                        'Gerenciar Anúncios',
                        'Veja e edite seus anúncios',
                        'list',
                        '#2ecc71',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
                        false
                    )}

                    {renderActionCard(
                        'Ver Planos',
                        'Contrate ou altere seu plano',
                        'card',
                        '#f39c12',
                        handleViewPlans,
                        false
                    )}

                    {renderActionCard(
                        'Relatórios',
                        'Acompanhe o desempenho',
                        'analytics',
                        '#9b59b6',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento'),
                        false
                    )}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#f39c12',
        padding: 20,
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
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
        color: '#2c3e50',
        marginLeft: 10,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 5,
    },
    planStatus: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    statsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
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
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
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
    statsIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 2,
    },
    statsTitle: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
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