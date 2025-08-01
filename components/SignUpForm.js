import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Switch,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { CONFIRM_EMAIL_URL } from '../lib/config';
import TermsAndPrivacyScreen from './TermsAndPrivacyScreen';

export default function SignUpForm({ onBack }) {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        isRealtor: false,
        creci: '',
        companyName: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [termsType, setTermsType] = useState('terms');

    const updateFormData = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSignUp = async () => {
        // Validações
        if (!formData.fullName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem');
            return;
        }

        if (formData.password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (formData.isRealtor && !formData.creci) {
            Alert.alert('Erro', 'Para corretores, o CRECI é obrigatório');
            return;
        }

        if (!acceptedTerms) {
            Alert.alert('Erro', 'Você deve aceitar os Termos de Uso e Política de Privacidade para continuar');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Criar o usuário no Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: CONFIRM_EMAIL_URL,
                    data: {
                        full_name: formData.fullName,
                    },
                },
            });

            if (authError) throw authError;

            // 2. Criar o perfil na tabela profiles
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authData.user.id,
                        full_name: formData.fullName,
                        phone: formData.phone,
                        is_realtor: formData.isRealtor,
                        creci: formData.isRealtor ? formData.creci : null,
                        company_name: formData.isRealtor ? formData.companyName : null,
                    });

                if (profileError) {
                    console.error('Erro ao criar perfil:', profileError);
                    // Não vamos falhar o cadastro por causa do perfil, mas vamos logar o erro
                }
            }

            Alert.alert(
                'Sucesso!',
                'Conta criada! Verifique seu email para confirmar a conta.',
                [{ text: 'OK', onPress: onBack }]
            );

        } catch (error) {
            Alert.alert('Erro', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-add" size={60} color="#3498db" />
                        </View>
                        <Text style={styles.title}>Criar Conta</Text>
                        <Text style={styles.subtitle}>
                            Preencha seus dados para começar
                        </Text>

                        <View style={styles.form}>
                            {/* Nome Completo */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome completo *"
                                    placeholderTextColor="#7f8c8d"
                                    value={formData.fullName}
                                    onChangeText={(value) => updateFormData('fullName', value)}
                                    autoCapitalize="words"
                                />
                            </View>

                            {/* Email */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email *"
                                    placeholderTextColor="#7f8c8d"
                                    value={formData.email}
                                    onChangeText={(value) => updateFormData('email', value)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            {/* Telefone */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Telefone *"
                                    placeholderTextColor="#7f8c8d"
                                    value={formData.phone}
                                    onChangeText={(value) => updateFormData('phone', value)}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            {/* Senha */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Senha *"
                                    placeholderTextColor="#7f8c8d"
                                    value={formData.password}
                                    onChangeText={(value) => updateFormData('password', value)}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Confirmar Senha */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirmar senha *"
                                    placeholderTextColor="#7f8c8d"
                                    value={formData.confirmPassword}
                                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* É Corretor? */}
                            <View style={styles.switchContainer}>
                                <View style={styles.switchLabel}>
                                    <Ionicons name="business-outline" size={20} color="#7f8c8d" style={styles.switchIcon} />
                                    <Text style={styles.switchText}>Sou corretor de imóveis</Text>
                                </View>
                                <Switch
                                    value={formData.isRealtor}
                                    onValueChange={(value) => updateFormData('isRealtor', value)}
                                    trackColor={{ false: '#bdc3c7', true: '#3498db' }}
                                    thumbColor={formData.isRealtor ? '#fff' : '#f4f3f4'}
                                />
                            </View>

                            {/* CRECI (apenas se for corretor) */}
                            {formData.isRealtor && (
                                <View style={styles.inputContainer}>
                                    <Ionicons name="card-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="CRECI *"
                                        placeholderTextColor="#7f8c8d"
                                        value={formData.creci}
                                        onChangeText={(value) => updateFormData('creci', value)}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            )}

                            {/* Nome da Empresa (apenas se for corretor) */}
                            {formData.isRealtor && (
                                <View style={styles.inputContainer}>
                                    <Ionicons name="business-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Nome da empresa"
                                        placeholderTextColor="#7f8c8d"
                                        value={formData.companyName}
                                        onChangeText={(value) => updateFormData('companyName', value)}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}

                            {/* Checkbox de Aceitação dos Termos */}
                            <View style={styles.termsContainer}>
                                <TouchableOpacity
                                    style={styles.checkboxContainer}
                                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                                >
                                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                                        {acceptedTerms && (
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                        )}
                                    </View>
                                    <Text style={styles.termsText}>
                                        Li e aceito os{' '}
                                        <Text
                                            style={styles.termsLink}
                                            onPress={() => {
                                                setTermsType('terms');
                                                setShowTerms(true);
                                            }}
                                        >
                                            Termos de Uso
                                        </Text>
                                        {' '}e{' '}
                                        <Text
                                            style={styles.termsLink}
                                            onPress={() => {
                                                setTermsType('privacy');
                                                setShowTerms(true);
                                            }}
                                        >
                                            Política de Privacidade
                                        </Text>
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Botão de Cadastro */}
                            <TouchableOpacity
                                style={[styles.button, (isLoading || !acceptedTerms) && styles.buttonDisabled]}
                                onPress={handleSignUp}
                                disabled={isLoading || !acceptedTerms}
                            >
                                <Ionicons
                                    name={isLoading ? "hourglass-outline" : "person-add-outline"}
                                    size={20}
                                    color="#fff"
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.buttonText}>
                                    {isLoading ? 'Criando conta...' : !acceptedTerms ? 'Aceite os termos para continuar' : 'Criar Conta'}
                                </Text>
                            </TouchableOpacity>

                            {/* Botão Voltar */}
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={onBack}
                            >
                                <Ionicons name="arrow-back-outline" size={16} color="#3498db" style={styles.backIcon} />
                                <Text style={styles.backText}>Voltar ao login</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            </TouchableWithoutFeedback>

            {/* Modal de Termos e Política de Privacidade */}
            <TermsAndPrivacyScreen
                visible={showTerms}
                onClose={() => setShowTerms(false)}
                type={termsType}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 50, // Espaço extra no final para o teclado
    },
    content: {
        padding: 20,
        alignItems: 'center',
        minHeight: '100%',
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
        marginBottom: 30,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 350,
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
        placeholderTextColor: '#7f8c8d',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    switchLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    switchIcon: {
        marginRight: 10,
    },
    switchText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    button: {
        backgroundColor: '#3498db',
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
        marginTop: 10,
    },
    backIcon: {
        marginRight: 5,
    },
    backText: {
        color: '#3498db',
        fontSize: 14,
    },
    termsContainer: {
        marginBottom: 20,
        width: '100%',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 10,
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#3498db',
    },
    termsText: {
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
}); 