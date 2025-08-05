import React, { useState } from 'react';
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
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { RESET_PASSWORD_URL } from '../lib/config';
import SignUpForm from './SignUpForm';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const { signIn, signUp } = useAuth();

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = isSignUp
                ? await signUp(email, password)
                : await signIn(email, password);

            if (error) {
                Alert.alert('Erro', error.message);
            } else if (isSignUp) {
                Alert.alert(
                    'Sucesso!',
                    'Conta criada! Verifique seu email para confirmar a conta.',
                    [{ text: 'OK' }]
                );
                setIsSignUp(false);
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Erro', 'Por favor, digite seu email');
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: RESET_PASSWORD_URL,
            });

            if (error) {
                Alert.alert('Erro', error.message);
            } else {
                Alert.alert(
                    'Email enviado!',
                    'Verifique sua caixa de entrada para redefinir sua senha.',
                    [{ text: 'OK' }]
                );
                setIsForgotPassword(false);
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    // Se está no modo de cadastro, mostrar o formulário completo
    if (isSignUp) {
        return <SignUpForm onBack={() => setIsSignUp(false)} />;
    }

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
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../assets/logo_bb.jpg')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>BuscaBusca Imóveis</Text>
                        <Text style={styles.subtitle}>
                            {isForgotPassword
                                ? 'Recuperar senha'
                                : 'Faça login para continuar'
                            }
                        </Text>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    placeholderTextColor="#7f8c8d"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {!isForgotPassword && (
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Senha"
                                        placeholderTextColor="#7f8c8d"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.button, isLoading && styles.buttonDisabled]}
                                onPress={isForgotPassword ? handleForgotPassword : handleAuth}
                                disabled={isLoading}
                            >
                                <Ionicons
                                    name={isLoading ? "hourglass-outline" : (isForgotPassword ? "mail-outline" : "log-in-outline")}
                                    size={20}
                                    color="#fff"
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.buttonText}>
                                    {isLoading
                                        ? 'Carregando...'
                                        : (isForgotPassword ? 'Enviar Email' : 'Entrar')
                                    }
                                </Text>
                            </TouchableOpacity>

                            {!isForgotPassword && (
                                <TouchableOpacity
                                    style={styles.switchButton}
                                    onPress={() => setIsSignUp(true)}
                                >
                                    <Text style={styles.switchText}>
                                        Não tem conta? Cadastre-se
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {!isForgotPassword && (
                                <TouchableOpacity
                                    style={styles.forgotButton}
                                    onPress={() => setIsForgotPassword(true)}
                                >
                                    <Text style={styles.forgotText}>Esqueci minha senha</Text>
                                </TouchableOpacity>
                            )}

                            {isForgotPassword && (
                                <TouchableOpacity
                                    style={styles.switchButton}
                                    onPress={() => setIsForgotPassword(false)}
                                >
                                    <Text style={styles.switchText}>Voltar ao login</Text>
                                </TouchableOpacity>
                            )}
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
        backgroundColor: '#f8f9fa',
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
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 60,
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
        color: '#1e3a8a',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748b',
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
        borderColor: '#e2e8f0',
        paddingHorizontal: 15,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 15,
        fontSize: 16,
        color: '#000', // Cor do texto para ser visível
    },
    button: {
        backgroundColor: '#1e3a8a',
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
    switchButton: {
        alignItems: 'center',
    },
    switchText: {
        color: '#1e3a8a',
        fontSize: 14,
    },
    forgotButton: {
        alignItems: 'center',
        marginTop: 10,
    },
    forgotText: {
        color: '#e74c3c',
        fontSize: 14,
    },
}); 