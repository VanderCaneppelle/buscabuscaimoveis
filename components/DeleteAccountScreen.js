import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StandardHeader from './StandardHeader';
import { translateError } from '../lib/errorMessages';
import AppText from './AppText';

export default function DeleteAccountScreen({ navigation }) {
    const { user, signOut } = useAuth();
    const [deletingAccount, setDeletingAccount] = useState(false);

    const confirmDeleteAccount = async () => {
        if (!user?.id) {
            Alert.alert('Erro', 'Usuário não encontrado');
            return;
        }

        try {
            setDeletingAccount(true);

            // Obter token de autenticação
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session?.access_token) {
                throw new Error('Não foi possível obter token de autenticação');
            }

            // Chamar API para deletar conta
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.buscabuscaimoveis.com.br';
            const response = await fetch(`${apiUrl}/api/account/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erro ao excluir conta');
            }

            // Sucesso - fazer logout
            Alert.alert(
                'Conta Excluída',
                'Sua conta foi excluída com sucesso. Obrigado por usar o Busca Busca Imóveis!',
                [
                    {
                        text: 'OK',
                        onPress: async () => {
                            // Fazer logout e redirecionar para login
                            await signOut(false);
                        }
                    }
                ]
            );

        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            const friendlyMessage = translateError(error);
            Alert.alert(
                'Erro ao Excluir Conta',
                friendlyMessage || 'Não foi possível excluir sua conta. Por favor, tente novamente ou entre em contato com o suporte.'
            );
        } finally {
            setDeletingAccount(false);
        }
    };

    const handleDeletePress = () => {
        Alert.alert(
            'Confirmação Final',
            'Esta é sua última chance. Tem certeza absoluta que deseja excluir sua conta permanentemente?\n\n' +
            'Esta ação não pode ser desfeita.',
            [
                { 
                    text: 'Cancelar', 
                    style: 'cancel' 
                },
                {
                    text: 'Sim, excluir permanentemente',
                    style: 'destructive',
                    onPress: confirmDeleteAccount
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StandardHeader
                title="Excluir Conta"
                subtitle="Remover sua conta permanentemente"
            />

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Aviso Principal */}
                <View style={styles.warningCard}>
                    <View style={styles.warningIconContainer}>
                        <Ionicons name="warning" size={48} color="#DC2626" />
                    </View>
                    <AppText style={styles.warningTitle}>
                        Atenção: Esta ação é permanente
                    </AppText>
                    <AppText style={styles.warningText}>
                        Ao excluir sua conta, todos os seus dados serão removidos permanentemente e não poderão ser recuperados.
                    </AppText>
                </View>

                {/* O que será deletado */}
                <View style={styles.section}>
                    <AppText style={styles.sectionTitle}>O que será removido:</AppText>
                    
                    <View style={styles.listItem}>
                        <Ionicons name="home" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Todos os seus anúncios e imóveis</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="film" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Todos os seus stories</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="heart" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Todos os seus favoritos</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="card" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Seu histórico de pagamentos</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="notifications" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Todas as suas notificações</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="person" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Seu perfil e informações pessoais</AppText>
                    </View>

                    <View style={styles.listItem}>
                        <Ionicons name="calendar" size={20} color="#DC2626" />
                        <AppText style={styles.listItemText}>Suas assinaturas e planos</AppText>
                    </View>
                </View>

                {/* Aviso sobre planos e restituição */}
                <View style={styles.planWarningCard}>
                    <View style={styles.planWarningHeader}>
                        <Ionicons name="card" size={24} color="#DC2626" />
                        <AppText style={styles.planWarningTitle}>Atenção: Planos e Assinaturas</AppText>
                    </View>
                    <View style={styles.planWarningContent}>
                        <View style={styles.planWarningItem}>
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                            <AppText style={styles.planWarningText}>
                                Todos os seus planos e assinaturas serão <AppText style={styles.planWarningBold}>cancelados e invalidados imediatamente</AppText>
                            </AppText>
                        </View>
                        <View style={styles.planWarningItem}>
                            <Ionicons name="cash-outline" size={20} color="#DC2626" />
                            <Text style={styles.planWarningText}>
                                <Text style={styles.planWarningBold}>Não haverá restituição de valores</Text> caso você ainda tenha planos válidos ou pagamentos pendentes
                            </Text>
                        </View>
                        <View style={styles.planWarningItem}>
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                            <Text style={styles.planWarningText}>
                                Se você tem um plano ativo, recomendamos aguardar o término do período contratado antes de excluir sua conta
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Informações importantes */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="information-circle" size={24} color="#F59E0B" />
                        <Text style={styles.infoTitle}>Informações Importantes</Text>
                    </View>
                    
                    <View style={styles.infoItem}>
                        <Text style={styles.infoBullet}>•</Text>
                        <Text style={styles.infoText}>
                            Você precisará criar uma nova conta para usar o app novamente
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <AppText style={styles.infoBullet}>•</AppText>
                        <AppText style={styles.infoText}>
                            Seus anúncios serão removidos imediatamente e não aparecerão mais no app
                        </AppText>
                    </View>

                    <View style={styles.infoItem}>
                        <AppText style={styles.infoBullet}>•</AppText>
                        <Text style={styles.infoText}>
                            Esta ação não pode ser desfeita ou cancelada após a confirmação
                        </Text>
                    </View>
                </View>

                {/* Botão de exclusão */}
                <View style={styles.actionSection}>
                    <TouchableOpacity 
                        style={[styles.deleteButton, deletingAccount && styles.deleteButtonDisabled]} 
                        onPress={handleDeletePress}
                        disabled={deletingAccount}
                    >
                        {deletingAccount ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" />
                                <AppText style={styles.deleteButtonText}>Excluindo conta...</AppText>
                            </>
                        ) : (
                            <>
                                <Ionicons name="trash" size={20} color="#fff" />
                                <AppText style={styles.deleteButtonText}>Excluir Conta Permanentemente</AppText>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        disabled={deletingAccount}
                    >
                        <AppText style={styles.cancelButtonText}>Cancelar</AppText>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    warningCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#FEE2E2',
        alignItems: 'center',
    },
    warningIconContainer: {
        marginBottom: 12,
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#DC2626',
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 14,
        color: '#991B1B',
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00335e',
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingLeft: 4,
    },
    listItemText: {
        fontSize: 15,
        color: '#374151',
        marginLeft: 12,
        flex: 1,
    },
    infoCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#92400E',
        marginLeft: 8,
    },
    infoItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    infoBullet: {
        fontSize: 16,
        color: '#F59E0B',
        marginRight: 8,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 14,
        color: '#92400E',
        flex: 1,
        lineHeight: 20,
    },
    actionSection: {
        marginTop: 8,
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    deleteButtonDisabled: {
        opacity: 0.6,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    cancelButtonText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '600',
    },
    planWarningCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    planWarningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    planWarningTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#DC2626',
        marginLeft: 8,
    },
    planWarningContent: {
        gap: 12,
    },
    planWarningItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    planWarningText: {
        fontSize: 14,
        color: '#991B1B',
        marginLeft: 8,
        flex: 1,
        lineHeight: 20,
    },
    planWarningBold: {
        fontWeight: '700',
    },
});

