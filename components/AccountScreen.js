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

export default function AccountScreen({ navigation }) {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const [userPlanInfo, setUserPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            loadUserData();
        }
    }, [user?.id]);

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
            const planInfo = await PlanService.getUserPlanInfo(user.id);
            setUserPlanInfo(planInfo);
        } catch (error) {
            console.error('Erro ao buscar informações do plano:', error);
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

    const renderStatsCard = (title, value, icon, color) => (
        <View style={styles.statsCard}>
            <View style={[styles.statsIcon, { backgroundColor: color }]}>
                <Ionicons name={icon} size={16} color="#fff" />
            </View>
            <Text style={styles.statsValue}>{value}</Text>
            <Text style={styles.statsTitle}>{title}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Minha Conta</Text>
                <Text style={styles.headerSubtitle}>Gerencie seu perfil e configurações</Text>
            </View>

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

                {/* Quick Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>Resumo</Text>
                    <View style={styles.statsGrid}>
                        {renderStatsCard(
                            'Anúncios',
                            userPlanInfo?.canCreate.current_ads || 0,
                            'home',
                            '#3498db'
                        )}
                        {renderStatsCard(
                            'Favoritos',
                            '0',
                            'heart',
                            '#e74c3c'
                        )}
                        {renderStatsCard(
                            'Visualizações',
                            '0',
                            'eye',
                            '#2ecc71'
                        )}
                    </View>
                </View>

                {/* Plan Info */}
                {userPlanInfo?.plan && (
                    <View style={styles.planSection}>
                        <Text style={styles.sectionTitle}>Plano Atual</Text>
                        <View style={styles.planCard}>
                            <View style={styles.planHeader}>
                                <Ionicons name="card" size={24} color="#3498db" />
                                <Text style={styles.planName}>{userPlanInfo.plan.display_name}</Text>
                            </View>
                            <Text style={styles.planStatus}>
                                {userPlanInfo.canCreate.can_create
                                    ? `${userPlanInfo.canCreate.current_ads}/${userPlanInfo.canCreate.max_ads} anúncios ativos`
                                    : userPlanInfo.canCreate.reason
                                }
                            </Text>
                            <TouchableOpacity
                                style={styles.upgradeButton}
                                onPress={() => navigation.navigate('Plans')}
                            >
                                <Text style={styles.upgradeButtonText}>Alterar Plano</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

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

                    {renderMenuItem(
                        'Meus Anúncios',
                        'Gerencie seus anúncios publicados',
                        'list',
                        '#2ecc71',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                    )}

                    {renderMenuItem(
                        'Histórico de Planos',
                        'Veja suas assinaturas anteriores',
                        'time',
                        '#f39c12',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                    )}

                    {renderMenuItem(
                        'Notificações',
                        'Configure suas preferências',
                        'notifications',
                        '#9b59b6',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                    )}

                    {renderMenuItem(
                        'Privacidade',
                        'Gerencie sua privacidade',
                        'shield-checkmark',
                        '#e67e22',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                    )}

                    {renderMenuItem(
                        'Ajuda e Suporte',
                        'Entre em contato conosco',
                        'help-circle',
                        '#34495e',
                        () => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')
                    )}

                    {renderMenuItem(
                        'Sobre o App',
                        'Versão 1.0.0',
                        'information-circle',
                        '#7f8c8d',
                        () => Alert.alert('Sobre', 'BuscaBusca Imóveis v1.0.0\n\nEncontre o imóvel dos seus sonhos!')
                    )}
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                    <Text style={styles.logoutButtonText}>Sair do App</Text>
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
        backgroundColor: '#9b59b6',
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
        color: '#2c3e50',
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