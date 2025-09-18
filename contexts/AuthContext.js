import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { PlanService } from '../lib/planService';
import { PushNotificationService } from '../lib/pushNotificationService';
import * as Linking from 'expo-linking';
import { CONFIRM_EMAIL_URL } from '../lib/config';
import sessionManager from '../lib/sessionManager';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Função para verificar e fazer logout se necessário
    const checkAndLogoutIfInvalid = async () => {
        try {
            // Obter usuário diretamente do Supabase
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            if (!currentUser) {
                console.log('❌ Nenhum usuário logado para verificar sessão');
                return;
            }

            console.log('🔍 Verificando validade da sessão para usuário:', currentUser.email);
            const isValid = await sessionManager.validateSession();

            if (!isValid) {
                console.log('❌ Sessão invalidada - fazendo logout automático');

                // Mostrar alerta para o usuário
                Alert.alert(
                    'Sessão Encerrada',
                    'Você foi desconectado porque fez login em outro dispositivo ou sua sessão expirou.',
                    [
                        {
                            text: 'OK',
                            onPress: async () => {
                                console.log('Usuário confirmou logout automático');
                                try {
                                    // Limpar estado do usuário primeiro
                                    setUser(null);
                                    // Invalidar sessão no banco
                                    await sessionManager.invalidateSession();
                                    // Fazer logout no Supabase
                                    await supabase.auth.signOut();
                                    console.log('✅ Logout automático realizado com sucesso');
                                } catch (error) {
                                    console.error('❌ Erro no logout automático:', error);
                                    // Garantir que o usuário seja limpo mesmo com erro
                                    setUser(null);
                                }
                            }
                        }
                    ]
                );
            } else {
                console.log('✅ Sessão válida - usuário pode continuar');
            }
        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
        }
    };

    useEffect(() => {
        // Inicializar o gerenciador de sessão
        sessionManager.initialize();

        // Verificar se há um usuário logado
        checkUser();

        // Escutar mudanças na autenticação
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session?.user) {
                console.log('Usuário fez login - registrando sessão');
                await sessionManager.registerSession();
                // Disparar registro de push em background para não bloquear login
                (async () => {
                    try {
                        await PushNotificationService.requestPermissions();
                        await PushNotificationService.registerTokenAutomatically(session.user.id);
                        console.log('✅ Push token registrado pós-login (onAuthStateChange)');
                    } catch (e) {
                        console.log('⚠️ Erro ao registrar push token pós-login:', e?.message || e);
                    }
                })();

                // // Associar plano gratuito automaticamente se for novo usuário
                // try {
                //     await PlanService.assignFreePlan(session.user.id);
                //     console.log('✅ Plano gratuito associado automaticamente');
                // } catch (error) {
                //     console.log('⚠️ Erro ao associar plano gratuito (pode já ter):', error.message);
                // }

                setUser(session.user);
            } else if (event === 'INITIAL_SESSION' && session?.user) {
                console.log('Sessão inicial detectada');
                setUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                console.log('Usuário fez logout');
                setUser(null);
            }

            setLoading(false);
        });

        // Configurar deep linking
        const handleDeepLink = (url) => {
            if (url) {
                console.log('Deep link received:', url);
            }
        };

        // Escutar deep links
        const subscriptionLinking = Linking.addEventListener('url', handleDeepLink);

        // Verificar sessão quando o app volta ao foco (com throttle para evitar verificações excessivas)
        let lastSessionCheck = 0;
        const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutos

        const handleAppStateChange = async (nextAppState) => {
            // Só fazer log em desenvolvimento
            if (__DEV__) {
                console.log('🔄 Mudança de estado do app:', nextAppState);
            }

            if (nextAppState === 'active') {
                const now = Date.now();

                // Só verificar sessão se passou mais de 5 minutos da última verificação
                if (now - lastSessionCheck < SESSION_CHECK_INTERVAL) {
                    if (__DEV__) {
                        console.log('📱 Verificação de sessão ignorada - muito recente');
                    }
                    return;
                }

                lastSessionCheck = now;

                if (__DEV__) {
                    console.log('📱 App voltou ao foco - verificando sessão...');
                }

                // Verificar se há sessão no Supabase primeiro
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    if (__DEV__) {
                        console.log('📱 Usuário encontrado no Supabase:', session.user.email);
                    }

                    // Verificar se há sessão local no sessionManager
                    const hasLocalSession = await sessionManager.hasValidSession();

                    if (hasLocalSession) {
                        if (__DEV__) {
                            console.log('📱 Sessão local encontrada - verificando validade...');
                        }
                        await checkAndLogoutIfInvalid();
                    } else {
                        console.log('📱 Sessão local inválida ou não encontrada - fazendo logout automático');
                        // Se não há sessão válida, fazer logout automático
                        Alert.alert(
                            'Sessão Encerrada',
                            'Você foi desconectado porque fez login em outro dispositivo ou sua sessão expirou.',
                            [
                                {
                                    text: 'OK',
                                    onPress: async () => {
                                        console.log('Usuário confirmou logout automático');
                                        try {
                                            setUser(null);
                                            await sessionManager.invalidateSession();
                                            await supabase.auth.signOut();
                                            console.log('✅ Logout automático realizado com sucesso');
                                        } catch (error) {
                                            console.error('❌ Erro no logout automático:', error);
                                            setUser(null);
                                        }
                                    }
                                }
                            ]
                        );
                    }
                } else {
                    if (__DEV__) {
                        console.log('📱 Nenhum usuário logado no Supabase');
                    }
                }
            }
        };

        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.unsubscribe();
            subscriptionLinking?.remove();
            appStateSubscription?.remove();
        };
    }, []); // Executar apenas uma vez na inicialização

    const checkUser = async () => {
        try {
            console.log('Verificando sessão do usuário...');
            const { data: { session } } = await supabase.auth.getSession();
            console.log('Sessão encontrada:', session?.user?.email);

            if (session?.user) {
                // Verificar se já existe uma sessão válida
                const hasValidSession = await sessionManager.hasValidSession();
                if (!hasValidSession) {
                    console.log('Usuário já logado - registrando sessão...');
                    await sessionManager.registerSession();
                } else {
                    console.log('Usuário já logado - sessão válida encontrada');
                }
            }

            setUser(session?.user ?? null);
        } catch (error) {
            console.error('Erro ao verificar usuário:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Se o login foi bem-sucedido, configurar e registrar push em background
            if (data.user) {
                (async () => {
                    try {
                        await PushNotificationService.requestPermissions();
                        await PushNotificationService.registerTokenAutomatically(data.user.id);
                        console.log('✅ Push token registrado pós-login (signIn)');
                    } catch (pushError) {
                        console.log('⚠️ Erro ao registrar push pós-login:', pushError.message);
                    }
                })();
            }

            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signUp = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: CONFIRM_EMAIL_URL,
                },
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error };
        }
    };

    const signOut = async (showMessage = false) => {
        try {
            console.log('Fazendo logout...');

            // Função para executar o logout
            const executeLogout = async () => {
                try {
                    // Invalidar sessão no banco
                    await sessionManager.invalidateSession();

                    // Limpar estado do usuário
                    setUser(null);

                    // Fazer logout no Supabase
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        console.warn('Erro ao fazer logout no Supabase:', error);
                    }

                    console.log('Logout realizado com sucesso');
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    setUser(null);
                }
            };

            if (showMessage) {
                Alert.alert(
                    'Logout Realizado',
                    'Você foi desconectado com sucesso.',
                    [
                        {
                            text: 'OK',
                            onPress: executeLogout
                        }
                    ]
                );
            } else {
                await executeLogout();
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            setUser(null);
        }
    };

    const forceLogoutOtherDevices = async () => {
        try {
            await sessionManager.forceLogoutOtherDevices();
            console.log('Logout forçado em outros dispositivos');
        } catch (error) {
            console.error('Erro ao forçar logout:', error);
        }
    };

    const checkSessionValidity = async () => {
        if (user) {
            const isValid = await sessionManager.validateSession();
            if (!isValid) {
                console.log('Sessão invalidada - fazendo logout automático');
                await sessionManager.invalidateSession();
                setUser(null);
            }
            return isValid;
        }
        return false;
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signUp,
            signOut,
            forceLogoutOtherDevices,
            checkSessionValidity,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}; 