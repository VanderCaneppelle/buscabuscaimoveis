import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.id) {
            fetchProfile();
        }
    }, [user?.id]);

    const fetchProfile = async () => {
        try {
            console.log('🔍 Buscando perfil para usuário:', user?.id);

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error) {
                console.error('❌ Erro ao buscar perfil:', error);
            } else {
                console.log('✅ Perfil encontrado:', data);
                setProfile(data);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut(true); // Mostrar mensagem de logout manual
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Ionicons name="home" size={30} color="#fff" />
                </View>
                <Text style={styles.title}>BuscaBusca Imóveis</Text>
                <Text style={styles.welcome}>
                    Bem-vindo, {profile?.full_name || user?.email || 'Usuário'}!
                </Text>
            </View>

            <View style={styles.content}>
                <Text style={styles.subtitle}>
                    Seu app de busca de imóveis está funcionando!
                </Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Dados do Perfil</Text>
                    {loading ? (
                        <Text style={styles.infoText}>Carregando...</Text>
                    ) : (
                        <>
                            <Text style={styles.infoText}>
                                Nome: {profile?.full_name || 'Não informado'}
                            </Text>
                            <Text style={styles.infoText}>
                                Email: {user?.email}
                            </Text>
                            <Text style={styles.infoText}>
                                Telefone: {profile?.phone || 'Não informado'}
                            </Text>
                            {profile?.is_realtor && (
                                <>
                                    <Text style={styles.infoText}>
                                        CRECI: {profile?.creci || 'Não informado'}
                                    </Text>
                                    <Text style={styles.infoText}>
                                        Empresa: {profile?.company_name || 'Não informado'}
                                    </Text>
                                </>
                            )}
                            <Text style={styles.infoText}>
                                Tipo: {profile?.is_realtor ? 'Corretor' : 'Cliente'}
                            </Text>
                        </>
                    )}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                    <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
                    <Text style={styles.logoutButtonText}>Sair</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#3498db',
        padding: 20,
        alignItems: 'center',
    },
    headerIcon: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 25,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    welcome: {
        fontSize: 16,
        color: '#fff',
        opacity: 0.9,
    },
    content: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 30,
    },
    infoCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        marginBottom: 30,
        width: '100%',
        maxWidth: 300,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 5,
    },
    logoutButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutIcon: {
        marginRight: 8,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 