import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { checkTermsAcceptance, saveTermsAcceptance } from '../lib/termsConfig';
import TermsAndPrivacyScreen from './TermsAndPrivacyScreen';

export default function TermsAcceptanceCheck({ user, onTermsAccepted }) {
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showTermsScreen, setShowTermsScreen] = useState(false);
    const [termsType, setTermsType] = useState('terms');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            checkUserTermsAcceptance();
        }
    }, [user]);

    const checkUserTermsAcceptance = async () => {
        try {
            const needsAcceptance = await checkTermsAcceptance(supabase, user.id);
            
            if (needsAcceptance) {
                console.log('⚠️ Usuário precisa aceitar os termos novamente');
                setShowTermsModal(true);
            } else {
                console.log('✅ Usuário já aceitou os termos atuais');
                onTermsAccepted && onTermsAccepted();
            }
        } catch (error) {
            console.error('Erro ao verificar aceite dos termos:', error);
            // Em caso de erro, não bloqueia o usuário
            onTermsAccepted && onTermsAccepted();
        }
    };

    const handleAcceptTerms = async () => {
        if (!acceptedTerms) {
            Alert.alert('Aceite Necessário', 'Você deve aceitar os Termos de Uso e Política de Privacidade para continuar.');
            return;
        }

        setIsLoading(true);

        try {
            await saveTermsAcceptance(supabase, user.id);
            setShowTermsModal(false);
            setAcceptedTerms(false);
            console.log('✅ Termos aceitos com sucesso');
            onTermsAccepted && onTermsAccepted();
        } catch (error) {
            console.error('Erro ao salvar aceite dos termos:', error);
            Alert.alert('Erro', 'Não foi possível salvar o aceite dos termos. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeclineTerms = () => {
        Alert.alert(
            'Aceite Obrigatório',
            'Para usar o aplicativo, você deve aceitar os Termos de Uso e Política de Privacidade. Deseja sair do aplicativo?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Sair',
                    onPress: () => {
                        // Fazer logout do usuário
                        supabase.auth.signOut();
                    }
                }
            ]
        );
    };

    if (!showTermsModal) {
        return null;
    }

    return (
        <>
            <Modal
                visible={showTermsModal}
                animationType="fade"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="document-text" size={60} color="#3498db" />
                        </View>
                        
                        <Text style={styles.title}>Atualização dos Termos</Text>
                        
                        <Text style={styles.message}>
                            Os Termos de Uso e Política de Privacidade foram atualizados. 
                            Para continuar usando o aplicativo, você precisa aceitar as novas versões.
                        </Text>

                        <View style={styles.checkboxContainer}>
                            <View style={styles.checkboxRow}>
                                <TouchableOpacity
                                    style={styles.checkboxTouchable}
                                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                                >
                                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                                        {acceptedTerms && (
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                                <Text style={styles.checkboxText}>
                                    Li e aceito os{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={() => {
                                            setTermsType('terms');
                                            setShowTermsScreen(true);
                                        }}
                                    >
                                        Termos de Uso
                                    </Text>
                                    {' '}e{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={() => {
                                            setTermsType('privacy');
                                            setShowTermsScreen(true);
                                        }}
                                    >
                                        Política de Privacidade
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.declineButton]}
                                onPress={handleDeclineTerms}
                            >
                                <Text style={styles.declineButtonText}>Recusar</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton, (!acceptedTerms || isLoading) && styles.buttonDisabled]}
                                onPress={handleAcceptTerms}
                                disabled={!acceptedTerms || isLoading}
                            >
                                <Ionicons
                                    name={isLoading ? "hourglass-outline" : "checkmark-outline"}
                                    size={20}
                                    color="#fff"
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.acceptButtonText}>
                                    {isLoading ? 'Salvando...' : 'Aceitar e Continuar'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <TermsAndPrivacyScreen
                visible={showTermsScreen}
                onClose={() => setShowTermsScreen(false)}
                type={termsType}
            />
        </>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 50,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#34495e',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
    },
    checkboxContainer: {
        width: '100%',
        marginBottom: 25,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkboxTouchable: {
        marginRight: 10,
        marginTop: 2,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#3498db',
    },
    checkboxText: {
        flex: 1,
        fontSize: 14,
        color: '#2c3e50',
        lineHeight: 20,
    },
    termsLink: {
        color: '#3498db',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    declineButton: {
        backgroundColor: '#e74c3c',
    },
    acceptButton: {
        backgroundColor: '#3498db',
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    buttonIcon: {
        marginRight: 8,
    },
    declineButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 