import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Platform } from 'react-native';

class SessionManager {
    constructor() {
        this.currentSessionId = null;
        this.isInitialized = false;
    }

    // Gerar ID único para a sessão
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Obter informações do dispositivo
    getDeviceInfo() {
        return {
            platform: Platform.OS,
            version: Platform.Version,
            timestamp: new Date().toISOString(),
        };
    }

    // Inicializar o gerenciador de sessão
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Verificar se há uma sessão ativa
            const activeSession = await AsyncStorage.getItem('active_session');

            if (activeSession) {
                const sessionData = JSON.parse(activeSession);
                this.currentSessionId = sessionData.sessionId;
            }

            this.isInitialized = true;
            console.log('SessionManager inicializado');
        } catch (error) {
            console.error('Erro ao inicializar SessionManager:', error);
        }
    }

    // Registrar nova sessão
    async registerSession() {
        try {
            console.log('🚀 Iniciando registro de nova sessão...');

            // Gerar novo ID de sessão
            const sessionId = this.generateSessionId();
            const deviceInfo = this.getDeviceInfo();

            console.log('📱 ID da sessão gerado:', sessionId);

            // Salvar sessão localmente
            const sessionData = {
                sessionId,
                deviceInfo,
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
            };

            await AsyncStorage.setItem('active_session', JSON.stringify(sessionData));
            this.currentSessionId = sessionId;

            console.log('💾 Sessão salva localmente');

            // Invalidar outras sessões primeiro
            console.log('🗑️ Invalidando outras sessões...');
            await this.invalidateAllOtherSessions();

            // Registrar nova sessão no Supabase
            console.log('📝 Registrando sessão no Supabase...');
            await this.registerSessionInSupabase(sessionId, deviceInfo);

            console.log('✅ Nova sessão registrada com sucesso:', sessionId);
            return sessionId;
        } catch (error) {
            console.error('❌ Erro ao registrar sessão:', error);
            throw error;
        }
    }

    // Registrar sessão no Supabase
    async registerSessionInSupabase(sessionId, deviceInfo) {
        try {
            console.log('🔄 Iniciando registro de sessão no Supabase...');

            // Obter o usuário atual
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.warn('❌ Usuário não autenticado ao registrar sessão');
                return;
            }

            console.log('✅ Usuário encontrado:', user.id);

            // Inserir diretamente na tabela
            const sessionData = {
                user_id: user.id,
                session_id: sessionId,
                device_info: JSON.stringify(deviceInfo),
                ip_address: null,
                is_active: true,
                last_activity: new Date().toISOString()
            };

            console.log('📝 Tentando inserir sessão:', sessionData);

            const { data, error } = await supabase
                .from('active_sessions')
                .upsert(sessionData, {
                    onConflict: 'user_id,session_id'
                });

            if (error) {
                console.error('❌ Erro ao registrar sessão no Supabase:', error);
            } else {
                console.log('✅ Sessão registrada no Supabase:', sessionId);
            }
        } catch (error) {
            console.error('❌ Erro ao registrar sessão no Supabase:', error);
        }
    }

    // Validar sessão atual
    async validateSession() {
        try {
            if (!this.currentSessionId) return false;

            const sessionData = await AsyncStorage.getItem('active_session');
            if (!sessionData) return false;

            const session = JSON.parse(sessionData);

            // Verificar se é a mesma sessão
            if (session.sessionId !== this.currentSessionId) {
                console.log('Session ID não corresponde');
                return false;
            }

            // Atualizar last_activity
            session.lastActivity = new Date().toISOString();
            await AsyncStorage.setItem('active_session', JSON.stringify(session));

            // Verificar no Supabase
            const isValidInSupabase = await this.validateSessionInSupabase();

            console.log('Validação de sessão:', {
                sessionId: this.currentSessionId,
                isValidInSupabase,
                finalResult: isValidInSupabase
            });

            return isValidInSupabase;
        } catch (error) {
            console.error('Erro ao validar sessão:', error);
            return false;
        }
    }

    // Validar sessão no Supabase
    async validateSessionInSupabase() {
        try {
            if (!this.currentSessionId) return false;

            // Obter o usuário atual
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('Usuário não autenticado ao validar sessão');
                return false;
            }

            // Verificar se a sessão existe e está ativa
            const { data: sessionData, error: sessionError } = await supabase
                .from('active_sessions')
                .select('is_active')
                .eq('user_id', user.id)
                .eq('session_id', this.currentSessionId)
                .eq('is_active', true)
                .single();

            if (sessionError) {
                console.warn('Erro ao buscar sessão no Supabase:', sessionError);
                // Se não encontrou a sessão ou deu erro, considera inválida
                return false;
            }

            if (!sessionData) {
                console.log('Sessão não encontrada no banco:', this.currentSessionId);
                return false;
            }

            const isValid = sessionData.is_active;
            console.log('Validação no Supabase:', {
                sessionId: this.currentSessionId,
                userId: user.id,
                isActive: isValid
            });

            return isValid;
        } catch (error) {
            console.warn('Erro ao validar sessão no Supabase:', error);
            // Qualquer erro considera a sessão inválida
            return false;
        }
    }

    // Invalidar sessão atual
    async invalidateSession() {
        try {
            console.log('🧹 Invalidando sessão...');

            // Limpar sessão local
            await this.clearSession();

            // Invalidar no Supabase
            await this.invalidateSessionInSupabase();

            this.currentSessionId = null;
            console.log('✅ Sessão invalidada');
        } catch (error) {
            console.error('❌ Erro ao invalidar sessão:', error);
        }
    }

    // Invalidar sessão atual no Supabase (logout)
    async invalidateSessionInSupabase() {
        try {
            // Obter o usuário atual
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.warn('Usuário não autenticado ao invalidar sessão');
                return;
            }

            // Invalidar TODAS as sessões do usuário
            const { error } = await supabase
                .from('active_sessions')
                .update({
                    is_active: false,
                    last_activity: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) {
                console.warn('Erro ao invalidar sessão no Supabase:', error);
            } else {
                console.log('Todas as sessões invalidadas no Supabase para usuário:', user.id);
            }
        } catch (error) {
            console.warn('Erro ao invalidar sessão no Supabase:', error);
        }
    }

    // Limpar sessão local
    async clearSession() {
        try {
            console.log('🧹 Limpando sessão local...');
            await AsyncStorage.removeItem('active_session');
            this.currentSessionId = null;
            console.log('✅ Sessão local limpa');
        } catch (error) {
            console.error('❌ Erro ao limpar sessão:', error);
        }
    }

    // Verificar se há uma sessão válida no banco
    async hasValidSession() {
        try {
            if (!this.currentSessionId) {
                console.log('❌ Nenhuma sessão local encontrada');
                return false;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.log('❌ Usuário não autenticado');
                return false;
            }

            console.log('🔍 Verificando sessão válida:', this.currentSessionId);

            const { data, error } = await supabase
                .from('active_sessions')
                .select('is_active')
                .eq('user_id', user.id)
                .eq('session_id', this.currentSessionId)
                .eq('is_active', true)
                .single();

            if (error) {
                console.log('❌ Erro ao verificar sessão:', error.message);
                // Se não encontrou a sessão, considera inválida
                return false;
            }

            if (!data) {
                console.log('❌ Sessão não encontrada no banco');
                return false;
            }

            console.log('✅ Sessão válida encontrada');
            return data.is_active === true;
        } catch (error) {
            console.warn('❌ Erro ao verificar sessão válida:', error);
            // Qualquer erro considera a sessão inválida
            return false;
        }
    }

    // Invalidar todas as outras sessões do usuário (login)
    async invalidateAllOtherSessions() {
        try {
            console.log('🔄 Iniciando invalidação de outras sessões...');

            // Obter o usuário atual
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('❌ Usuário não autenticado ao invalidar outras sessões');
                return;
            }

            console.log('✅ Usuário encontrado para invalidação:', user.id);

            // Invalidar TODAS as sessões ativas do usuário
            const { error } = await supabase
                .from('active_sessions')
                .update({
                    is_active: false,
                    last_activity: new Date().toISOString()
                })
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (error) {
                console.warn('⚠️ Erro ao invalidar outras sessões:', error.message);
            } else {
                console.log('✅ Outras sessões invalidadas para usuário:', user.id);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao invalidar outras sessões:', error.message);
        }
    }

    // Função para forçar logout em outros dispositivos (mantida para compatibilidade)
    async forceLogoutOtherDevices() {
        console.log('Logout forçado automático já implementado no login');
    }
}

// Instância singleton
const sessionManager = new SessionManager();

export default sessionManager; 