import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useUserPlanStore } from '../stores/userPlanStore';
import PropertyCacheService from '../lib/propertyCacheService';
import { useFocusEffect } from '@react-navigation/native';
import StandardHeader from './StandardHeader';
import AppText from './AppText';
// Removido: NotificationManager

export default function AccountScreen({ navigation }) {
    console.log('Rendered AccountScreen');

    const { user, signOut } = useAuth();

    // ✅ Zustand: User Plan Store (selecionar campos individuais para evitar loops)
    const plan = useUserPlanStore(state => state.plan);
    const planEndDate = useUserPlanStore(state => state.planEndDate);
    const isPlanExpired = useUserPlanStore(state => state.isPlanExpired);
    const currentAds = useUserPlanStore(state => state.currentAds);
    const maxAds = useUserPlanStore(state => state.maxAds);
    const canCreateAd = useUserPlanStore(state => state.canCreateAd);
    const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);

    // Memoizar planSummary para evitar recriação
    const planSummary = useMemo(() => ({
        planName: plan?.display_name || 'Gratuito',
        endDate: planEndDate,
        isExpired: isPlanExpired,
        ads: { current: currentAds, max: maxAds },
        permissions: { canCreate: canCreateAd }
    }), [plan?.display_name, planEndDate, isPlanExpired, currentAds, maxAds, canCreateAd]);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil:', error);
            } else {
                setProfile(data);
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
        }
    }, [user?.id]);

    const loadUserData = useCallback(async () => {
        if (!user?.id) return;

        try {
            setLoading(true);
            await Promise.all([
                fetchProfile(),
                fetchUserPlanData(user.id) // ✅ Usar Zustand (cache de 3 min)
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        } finally {
            setLoading(false);
        }
    }, [user?.id, fetchProfile, fetchUserPlanData]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                console.log('🔄 AccountScreen: Atualizando dados...');
                loadUserData();
            }
        }, [user?.id, loadUserData])
    );

    // ❌ REMOVIDO: fetchProfile duplicado e fetchEligibility - agora usa Zustand

    const handleSignOut = async () => {
        Alert.alert(
            'Sair do App',
            'Tem certeza que deseja sair?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', onPress: () => signOut(true), style: 'destructive' }
            ]
        );
    };

    // Função para formatar data de vencimento (considerando apenas data, não hora)
    const formatExpirationDate = (endDate) => {
        try {
            const date = new Date(endDate);
            const now = new Date();

            // Normalizar para meia-noite para comparar apenas a data
            const endDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const diffTime = endDateOnly.getTime() - nowDateOnly.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                return 'Vencido';
            } else if (diffDays === 1) {
                return '1 dia';
            } else if (diffDays <= 7) {
                return `${diffDays} dias`;
            } else {
                return date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return 'Data inválida';
        }
    };

    // Função para verificar se o plano está vencendo em breve (3 dias) - considerando apenas data
    const isExpiringSoon = (endDate) => {
        try {
            const date = new Date(endDate);
            const now = new Date();

            // Normalizar para meia-noite para comparar apenas a data
            const endDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const diffTime = endDateOnly.getTime() - nowDateOnly.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays <= 3 && diffDays > 0;
        } catch (error) {
            console.error('Erro ao verificar vencimento:', error);
            return false;
        }
    };

    // Função para lidar com renovação
    const handleRenewal = (currentPlan) => {
        // Determinar o plano base (remover _annual se existir)
        const basePlanName = currentPlan.plan_name?.replace('_annual', '') || 'bronze';

        // Navegar para PaymentDetails com o plano atual
        navigation.navigate('PaymentDetails', {
            plan: {
                name: basePlanName,
                display_name: currentPlan.display_name?.replace(' Anual', '') || 'Bronze'
            }
        });
    };

    const handleClearCache = async () => {
        Alert.alert(
            'Limpar Cache',
            'Isso irá limpar o cache local de propriedades. Os dados serão recarregados na próxima vez que você abrir a tela inicial.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await PropertyCacheService.clearCache();
                            Alert.alert('Sucesso', 'Cache limpo com sucesso!');
                        } catch (error) {
                            console.error('Erro ao limpar cache:', error);
                            Alert.alert('Erro', 'Não foi possível limpar o cache');
                        }
                    }
                }
            ]
        );
    };


    const renderMenuItem = (title, subtitle, icon, color, onPress, showBadge = false) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#fff" />
            </View>
            <View style={styles.menuContent}>
                <AppText style={styles.menuTitle}>{title}</AppText>
                {subtitle && <AppText style={styles.menuSubtitle}>{subtitle}</AppText>}
            </View>
            {showBadge && <View style={styles.badge} />}
            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
        </TouchableOpacity>
    );


    return (
        <SafeAreaView style={styles.container}>
            {/* Header Padrão */}
            <StandardHeader
                title="Minha Conta"
                subtitle="Gerencie seu perfil e configurações"
            />

            {/* Conteúdo Principal */}
            <View style={styles.contentContainer}>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* User Info Card */}
                    <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatarContainer}>
                                {profile?.avatar_url ? (
                                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Ionicons name="person" size={40} color="#fff" />
                                    </View>
                                )}
                            </View>
                            <View style={styles.userDetails}>
                                <AppText style={styles.userName}>
                                    {profile?.full_name || user?.email || 'Usuário'}
                                </AppText>
                                <AppText style={styles.userEmail}>{user?.email}</AppText>
                                <AppText style={styles.userType}>
                                    {profile?.is_realtor ? 'Corretor' : 'Cliente'}
                                </AppText>
                            </View>
                        </View>
                    </View>


                    {/* Plan Info */}
                    <View style={styles.planSection}>
                        <AppText style={styles.sectionTitle}>Plano Atual</AppText>
                        <View style={styles.planCard}>
                            <View style={styles.planHeader}>
                                <Ionicons name="card" size={24} color={planSummary.isExpired ? '#e74c3c' : '#3498db'} />
                                <AppText style={styles.planName}>
                                    {planSummary.isExpired
                                        ? `${planSummary.planName} (Vencido)`
                                        : planSummary.planName}
                                </AppText>
                            </View>
                            <AppText style={styles.planStatus}>
                                {planSummary.permissions.canCreate
                                    ? `${planSummary.ads.current}/${planSummary.ads.max} anúncios`
                                    : '—'}
                            </AppText>

                            {planSummary.endDate && (
                                <View style={styles.expirationInfo}>
                                    <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
                                    <AppText style={styles.expirationText}>
                                        Vence em: {formatExpirationDate(planSummary.endDate)}
                                    </AppText>
                                </View>
                            )}

                            {planSummary.endDate && isExpiringSoon(planSummary.endDate) && (
                                <View style={styles.renewalReminder}>
                                    <View style={styles.reminderHeader}>
                                        <Ionicons name="warning" size={16} color="#f39c12" />
                                        <AppText style={styles.reminderTitle}>Renovação Necessária</AppText>
                                    </View>
                                    <AppText style={styles.reminderText}>
                                        Seu plano vence em breve. Renove para continuar usando todos os recursos.
                                    </AppText>
                                    <TouchableOpacity
                                        style={styles.renewalButton}
                                        onPress={() => navigation.navigate('Plans')}
                                    >
                                        <AppText style={styles.renewalButtonText}>Renovar Plano</AppText>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.upgradeButton}
                                onPress={() => navigation.navigate('Plans')}
                            >
                                <AppText style={styles.upgradeButtonText}>Alterar Plano</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Menu Items */}
                    <View style={styles.menuSection}>
                        <AppText style={styles.sectionTitle}>Configurações</AppText>

                        {renderMenuItem(
                            'Editar Perfil',
                            'Atualize suas informações pessoais',
                            'person',
                            '#3498db',
                            () => navigation.navigate('EditProfile')
                        )}

                        {/* {renderMenuItem(
                            'Histórico de Planos',
                            'Veja suas assinaturas anteriores',
                            'time',
                            '#f39c12',
                            () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                        )} */}



                        {renderMenuItem(
                            'Privacidade',
                            'Gerencie sua privacidade',
                            'shield-checkmark',
                            '#e67e22',
                            () => navigation.navigate('TermsPrivacy')
                        )}

                        {renderMenuItem(
                            'Ajuda e Suporte',
                            'Entre em contato conosco',
                            'help-circle',
                            '#34495e',
                            () => navigation.navigate('HelpSupport')
                        )}

                        {renderMenuItem(
                            'Sobre o App',
                            'Versão 1.4.3',
                            'information-circle',
                            '#7f8c8d',
                            () => Alert.alert('Sobre', 'Busca Busca Imóveis\n\nVersão 1.4.3\n\nDesenvolvido por: TW Consultoria de TI\n\nContato: (47) 99241-4455')
                        )}

                        {renderMenuItem(
                            'Limpar Cache',
                            'Limpe o cache local de propriedades',
                            'trash-outline',
                            '#c0392b',
                            handleClearCache
                        )}

                        {renderMenuItem(
                            'Excluir Conta',
                            'Remover sua conta permanentemente',
                            'trash',
                            '#DC2626',
                            () => navigation.navigate('DeleteAccount')
                        )}
                    </View>

                    {/* Removido: Notification Manager */}

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                        <AppText style={styles.logoutButtonText}>Sair do App</AppText>
                    </TouchableOpacity>
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
    userCard: {
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
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 15,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#bdc3c7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00335e',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 4,
    },
    userType: {
        fontSize: 12,
        color: '#3498db',
        fontWeight: '600',
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
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statsValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 2,
    },
    statsTitle: {
        fontSize: 12,
        color: '#7f8c8d',
        textAlign: 'center',
    },
    planSection: {
        marginBottom: 20,
    },
    planCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 3,
    },
    planHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3498db',
        marginLeft: 10,
    },
    planStatus: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 15,
    },
    upgradeButton: {
        backgroundColor: '#3498db',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    expirationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    expirationText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginLeft: 6,
    },
    renewalReminder: {
        backgroundColor: '#fff3cd',
        borderColor: '#ffeaa7',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        marginBottom: 8,
    },
    reminderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    reminderTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#856404',
        marginLeft: 6,
    },
    reminderText: {
        fontSize: 13,
        color: '#856404',
        lineHeight: 18,
        marginBottom: 10,
    },
    renewalButton: {
        backgroundColor: '#f39c12',
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
    },
    renewalButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    menuSection: {
        marginBottom: 20,
    },
    menuItem: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 1,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 1,
        elevation: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 14,
        color: '#7f8c8d',
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#e74c3c',
        marginRight: 10,
    },
    logoutButton: {
        backgroundColor: '#e74c3c',
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 15,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
}); 