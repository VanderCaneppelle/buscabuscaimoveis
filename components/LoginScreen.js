import React, { useState, useEffect } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    Image,
    ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
// import { useLoading } from '../contexts/LoadingContext';
import { supabase } from '../lib/supabase';
import { translateError } from '../lib/errorMessages';
import { RESET_PASSWORD_URL } from '../lib/config';
import SignUpForm from './SignUpForm';
import AppText from './AppText';
import AppTextInput from './AppTextInput';

export default function LoginScreen() {
    console.log('Rendered LoginScreen');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);


    const { signIn } = useAuth();
    // const { withLoading } = useLoading();

    // Forçar o vídeo a carregar após um pequeno delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!videoLoaded && !videoError) {
                console.log('🎬 Tentando recarregar vídeo...');
                setVideoError(false);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [videoLoaded, videoError]);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        setIsLoading(true);
        try {
            // Delay de 2.5 segundos para mostrar o vídeo
            // await new Promise(resolve => setTimeout(resolve, 2500));

            // Fluxo padrão: apenas login.
            // O cadastro completo é feito na tela `SignUpForm`.
            const { data, error } = await signIn(email, password);

            if (error) {
                const friendlyMessage = translateError(error);
                Alert.alert('Erro ao entrar', friendlyMessage);
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
                const friendlyMessage = translateError(error);
                Alert.alert('Erro', friendlyMessage);
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
        <>
            <StatusBar
                backgroundColor="#ffcc1e"
                style="dark"
            />
            {isLoading && (
                <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                    zIndex: 10
                }}>
                    <ActivityIndicator size="large" color="#00335e" />
                </View>
            )}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -50}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.content}>
                            <View style={styles.logoContainer}>
                                <Video
                                    source={require('../assets/oficial_bb.mp4')}
                                    style={styles.logo}
                                    resizeMode="cover"
                                    shouldPlay={true}
                                    isLooping={true}
                                    isMuted={true}
                                    onLoadStart={() => console.log('🎬 Vídeo: Iniciando carregamento')}
                                    onLoad={() => {
                                        console.log('🎬 Vídeo: Carregado com sucesso');
                                        setVideoLoaded(true);
                                    }}
                                    onError={(error) => console.log('❌ Erro no vídeo:', error)}
                                />
                            </View>
                            <AppText style={styles.title}>Busca Busca Imóveis</AppText>
                            <AppText style={styles.subtitle}>
                                {isForgotPassword
                                    ? 'Recuperar senha'
                                    : 'Faça login para continuar'
                                }
                            </AppText>

                            <View style={styles.form}>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <AppTextInput
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
                                        <AppTextInput
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
                                    style={styles.button}
                                    onPress={isForgotPassword ? handleForgotPassword : handleAuth}
                                >
                                    <Ionicons
                                        name={isForgotPassword ? "mail-outline" : "log-in-outline"}
                                        size={20}
                                        color="#fff"
                                        style={styles.buttonIcon}
                                    />
                                    <AppText style={styles.buttonText}>
                                        {isForgotPassword ? 'Enviar Email' : 'Entrar'}
                                    </AppText>
                                </TouchableOpacity>

                                {!isForgotPassword && (
                                    <TouchableOpacity
                                        style={styles.switchButton}
                                        onPress={() => setIsSignUp(true)}
                                    >
                                        <AppText style={styles.switchText}>
                                            Não tem conta? Cadastre-se
                                        </AppText>
                                    </TouchableOpacity>
                                )}

                                {!isForgotPassword && (
                                    <TouchableOpacity
                                        style={styles.forgotButton}
                                        onPress={() => setIsForgotPassword(true)}
                                    >
                                        <AppText style={styles.forgotText}>Esqueci minha senha</AppText>
                                    </TouchableOpacity>
                                )}

                                {isForgotPassword && (
                                    <TouchableOpacity
                                        style={styles.switchButton}
                                        onPress={() => setIsForgotPassword(false)}
                                    >
                                        <AppText style={styles.switchText}>Voltar ao login</AppText>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffcc1e', // Nova cor amarela
    },
    scrollContainer: {
        flex: 1,
        justifyContent: 'center',
        // paddingBottom: 50, // Espaço extra no final para o teclado
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 200,
    },
    logo: {
        width: '100%',
        height: 200,
        borderRadius: 0,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.0,
        shadowRadius: 0,
        elevation: 0,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#00335e', // Novo azul escuro
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#00335e', // Novo azul escuro
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
        borderColor: '#00335e', // Novo azul escuro
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
        backgroundColor: '#00335e',
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
        color: '#00335e',
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