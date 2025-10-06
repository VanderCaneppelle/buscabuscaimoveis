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
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PlanService } from '../lib/planService';
import PropertyCacheService from '../lib/propertyCacheService';
import { useFocusEffect } from '@react-navigation/native';
// Removido: NotificationManager

export default function AccountScreen({ navigation }) {
    console.log('Rendered AccountScreen');

    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const [userPlanInfo, setUserPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadUserData();
        }
    }, [user?.id]);

    // Atualizar dados sempre que a tela ganhar foco
    useFocusEffect(
        React.useCallback(() => {
            if (user?.id) {
                console.log('🔄 AccountScreen: Atualizando dados...');
                loadUserData();
            }
        }, [user?.id])
    );

    const loadUserData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchProfile(),
                fetchUserPlanInfo()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
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
    };

    const fetchUserPlanInfo = async () => {
        try {
            // Buscar dados diretamente das tabelas
            const [activeSubscription, activeAds, favorites] = await Promise.all([
                // Buscar assinatura ativa
                supabase
                    .from('user_subscriptions')
                    .select(`
                        *,
                        plans (
                            id,
                            name,
                            display_name,
                            max_ads,
                            price
                        )
                    `)
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single(),

                // Buscar anúncios aprovados
                supabase
                    .from('properties')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'approved'),

                // Buscar favoritos
                supabase
                    .from('favorites')
                    .select('*')
                    .eq('user_id', user.id)
            ]);

            // Processar dados
            const planData = activeSubscription.data;
            const adsData = activeAds.data || [];
            const favoritesData = favorites.data || [];

            // Calcular visualizações (soma de todas as visualizações dos anúncios aprovados)
            const totalViews = adsData.reduce((sum, ad) => sum + (ad.views || 0), 0);

            setUserPlanInfo({
                plan: planData?.plans ? {
                    ...planData.plans,
                    end_date: planData.end_date,
                    plan_name: planData.plans.name
                } : null,
                subscription: planData,
                canCreate: {
                    can_create: planData ? adsData.length < planData.plans.max_ads : false,
                    current_ads: adsData.length,
                    max_ads: planData?.plans?.max_ads || 0,
                    plan_name: planData?.plans?.name || 'free'
                },
                stats: {
                    approvedAds: adsData.length,
                    favorites: favoritesData.length,
                    views: totalViews
                }
            });
        } catch (error) {
            console.error('Erro ao buscar informações do plano:', error);
            // Fallback para dados básicos
            setUserPlanInfo({
                plan: null,
                canCreate: { can_create: false, current_ads: 0, max_ads: 0, plan_name: 'free' },
                stats: { approvedAds: 0, favorites: 0, views: 0 }
            });
        }
    };

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

    // Função para formatar data de vencimento
    const formatExpirationDate = (endDate) => {
        try {
            const date = new Date(endDate);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
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

    // Função para verificar se o plano está vencendo em breve (3 dias)
    const isExpiringSoon = (endDate) => {
        try {
            const date = new Date(endDate);
            const now = new Date();
            const diffTime = date.getTime() - now.getTime();
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
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {showBadge && <View style={styles.badge} />}
            <Ionicons name="chevron-forward" size={20} color="#7f8c8d" />
        </TouchableOpacity>
    );


    return (
        <SafeAreaView style={styles.container}>
            {/* Header Amarelo com Título */}
            <View style={styles.headerContainer}>
                <View style={styles.titleContainer}>
                    <Image
                        source={require('../assets/logo_bb.jpg')}
                        style={styles.titleLogo}
                        resizeMode="contain"
                    />
                    <Text style={styles.headerTitle}>Minha Conta</Text>
                </View>
                <Text style={styles.headerSubtitle}>Gerencie seu perfil e configurações</Text>
            </View>

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
                                <Text style={styles.userName}>
                                    {profile?.full_name || user?.email || 'Usuário'}
                                </Text>
                                <Text style={styles.userEmail}>{user?.email}</Text>
                                <Text style={styles.userType}>
                                    {profile?.is_realtor ? 'Corretor' : 'Cliente'}
                                </Text>
                            </View>
                        </View>
                    </View>


                    {/* Plan Info */}
                    <View style={styles.planSection}>
                        <Text style={styles.sectionTitle}>Plano Atual</Text>
                        <View style={styles.planCard}>
                            {userPlanInfo?.plan ? (
                                <>
                                    <View style={styles.planHeader}>
                                        <Ionicons name="card" size={24} color="#3498db" />
                                        <Text style={styles.planName}>{userPlanInfo.plan.display_name}</Text>
                                    </View>
                                    <Text style={styles.planStatus}>
                                        {userPlanInfo.canCreate.can_create
                                            ? `${userPlanInfo.canCreate.current_ads}/${userPlanInfo.canCreate.max_ads} anúncios aprovados`
                                            : `Limite atingido: ${userPlanInfo.canCreate.current_ads}/${userPlanInfo.canCreate.max_ads} anúncios`
                                        }
                                    </Text>

                                    {/* Data de Vencimento */}
                                    {userPlanInfo.plan.end_date && (
                                        <View style={styles.expirationInfo}>
                                            <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
                                            <Text style={styles.expirationText}>
                                                Vence em: {formatExpirationDate(userPlanInfo.plan.end_date)}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Lembrete de Renovação */}
                                    {userPlanInfo.plan.end_date && isExpiringSoon(userPlanInfo.plan.end_date) && (
                                        <View style={styles.renewalReminder}>
                                            <View style={styles.reminderHeader}>
                                                <Ionicons name="warning" size={16} color="#f39c12" />
                                                <Text style={styles.reminderTitle}>Renovação Necessária</Text>
                                            </View>
                                            <Text style={styles.reminderText}>
                                                Seu plano vence em breve. Renove para continuar usando todos os recursos.
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.renewalButton}
                                                onPress={() => handleRenewal(userPlanInfo.plan)}
                                            >
                                                <Text style={styles.renewalButtonText}>Renovar Plano</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.upgradeButton}
                                        onPress={() => navigation.navigate('Plans')}
                                    >
                                        <Text style={styles.upgradeButtonText}>Alterar Plano</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <View style={styles.planHeader}>
                                        <Ionicons name="card" size={24} color="#95a5a6" />
                                        <Text style={styles.planName}>Plano Gratuito</Text>
                                    </View>
                                    <Text style={styles.planStatus}>
                                        {userPlanInfo?.canCreate?.current_ads || 0} anúncios aprovados
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.upgradeButton}
                                        onPress={() => navigation.navigate('Plans')}
                                    >
                                        <Text style={styles.upgradeButtonText}>Ver Planos</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Menu Items */}
                    <View style={styles.menuSection}>
                        <Text style={styles.sectionTitle}>Configurações</Text>

                        {renderMenuItem(
                            'Editar Perfil',
                            'Atualize suas informações pessoais',
                            'person',
                            '#3498db',
                            () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
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
                            'Versão 1.0.0',
                            'information-circle',
                            '#7f8c8d',
                            () => Alert.alert('Sobre', 'Busca Busca Imóveis\n\nVersão 1.0.0\n\nDesenvolvido por: TW Consultoria de TI\n\nContato: (47) 99241-4455')
                        )}

                        {renderMenuItem(
                            'Limpar Cache',
                            'Limpe o cache local de propriedades',
                            'trash-outline',
                            '#c0392b',
                            handleClearCache
                        )}
                    </View>

                    {/* Removido: Notification Manager */}

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" />
                        <Text style={styles.logoutButtonText}>Sair do App</Text>
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
    headerContainer: {
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#ffcc1e',
        paddingHorizontal: 20,
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