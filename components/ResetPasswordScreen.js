import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

export default function ResetPasswordScreen() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resetToken, setResetToken] = useState(null);

    // Extrair o token de reset da URL quando o componente carrega
    useEffect(() => {
        const extractTokenFromURL = async () => {
            try {
                const url = await Linking.getInitialURL();
                console.log('ResetPasswordScreen - URL inicial:', url);

                if (url) {
                    // Extrair o token da URL
                    const urlObj = new URL(url);
                    const token = urlObj.searchParams.get('token');
                    const type = urlObj.searchParams.get('type');

                    if (token && type === 'recovery') {
                        console.log('Token de reset encontrado:', token);
                        setResetToken(token);
                    } else {
                        console.log('Token não encontrado ou tipo incorreto');
                        Alert.alert('Erro', 'Link de reset inválido');
                    }
                }
            } catch (error) {
                console.error('Erro ao extrair token:', error);
                Alert.alert('Erro', 'Não foi possível processar o link de reset');
            }
        };

        extractTokenFromURL();
    }, []);

    const handleResetPassword = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (!resetToken) {
            Alert.alert('Erro', 'Token de reset não encontrado. Tente novamente.');
            return;
        }

        setIsLoading(true);

        try {
            console.log('Tentando resetar senha com token:', resetToken);

            // Usar o token de reset para alterar a senha
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                console.error('Erro ao resetar senha:', error);
                Alert.alert('Erro', error.message);
            } else {
                console.log('Senha alterada com sucesso:', data);
                Alert.alert(
                    'Sucesso!',
                    'Sua senha foi alterada com sucesso! Você pode fazer login com a nova senha.',
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Limpar os campos
                                setNewPassword('');
                                setConfirmPassword('');
                                // Aqui você pode adicionar navegação para voltar ao login
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Erro inesperado:', error);
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="lock-open" size={60} color="#3498db" />
                        </View>
                        <Text style={styles.title}>Nova Senha</Text>
                        <Text style={styles.subtitle}>
                            {resetToken ? 'Digite sua nova senha' : 'Carregando...'}
                        </Text>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nova senha"
                                    placeholderTextColor="#7f8c8d"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirmar nova senha"
                                    placeholderTextColor="#7f8c8d"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, (isLoading || !resetToken) && styles.buttonDisabled]}
                                onPress={handleResetPassword}
                                disabled={isLoading || !resetToken}
                            >
                                <Ionicons
                                    name={isLoading ? "hourglass-outline" : "checkmark-outline"}
                                    size={20}
                                    color="#fff"
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.buttonText}>
                                    {isLoading ? 'Alterando...' : !resetToken ? 'Carregando...' : 'Alterar Senha'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => {
                                    // Simplesmente recarregar o app para voltar ao login
                                    // Em um app real, você usaria navegação apropriada
                                    Alert.alert(
                                        'Voltar ao login',
                                        'Para voltar ao login, feche e abra o app novamente.',
                                        [{ text: 'OK' }]
                                    );
                                }}
                            >
                                <Ionicons name="arrow-back-outline" size={16} color="#3498db" style={styles.backIcon} />
                                <Text style={styles.backText}>Voltar ao login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 50, // Espaço extra no final para o teclado
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 50,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 40,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 300,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#000',
    },
    button: {
        backgroundColor: '#27ae60',
        borderRadius: 10,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    buttonDisabled: {
        backgroundColor: '#bdc3c7',
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
    },
    backIcon: {
        marginRight: 5,
    },
    backText: {
        color: '#3498db',
        fontSize: 14,
    },
}); 