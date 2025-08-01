// =====================================================
// CONFIGURAÇÃO DE VERSÕES DOS TERMOS E POLÍTICA
// =====================================================

// Versões atuais dos documentos
export const TERMS_VERSION = '1.0.0';
export const PRIVACY_VERSION = '1.0.0';

// Data da última atualização
export const TERMS_LAST_UPDATE = 'Julho/2025';
export const PRIVACY_LAST_UPDATE = 'Julho/2025';

// Função para verificar se o usuário precisa aceitar os termos novamente
export const checkTermsAcceptance = async (supabase, userId) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('terms_accepted_at, terms_version, privacy_accepted_at, privacy_version')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Erro ao verificar aceite dos termos:', error);
            return true; // Se erro, assume que precisa aceitar
        }

        if (!profile) {
            return true; // Sem perfil, precisa aceitar
        }

        // Verificar se aceitou os termos e se a versão está atualizada
        const needsTerms = !profile.terms_accepted_at || profile.terms_version !== TERMS_VERSION;
        const needsPrivacy = !profile.privacy_accepted_at || profile.privacy_version !== PRIVACY_VERSION;

        return needsTerms || needsPrivacy;
    } catch (error) {
        console.error('Erro ao verificar aceite dos termos:', error);
        return true; // Em caso de erro, assume que precisa aceitar
    }
};

// Função para salvar o aceite dos termos
export const saveTermsAcceptance = async (supabase, userId) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                terms_accepted_at: new Date().toISOString(),
                terms_version: TERMS_VERSION,
                privacy_accepted_at: new Date().toISOString(),
                privacy_version: PRIVACY_VERSION,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) {
            console.error('Erro ao salvar aceite dos termos:', error);
            throw error;
        }

        console.log('✅ Aceite dos termos salvo com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao salvar aceite dos termos:', error);
        throw error;
    }
};

// Função para obter informações das versões
export const getTermsInfo = () => ({
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    termsLastUpdate: TERMS_LAST_UPDATE,
    privacyLastUpdate: PRIVACY_LAST_UPDATE
}); 