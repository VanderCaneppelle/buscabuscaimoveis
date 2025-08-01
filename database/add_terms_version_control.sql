-- =====================================================
-- ADICIONAR CONTROLE DE VERSÃO DOS TERMOS NA TABELA PROFILES
-- =====================================================

-- Adicionar campos para controle de versão dos termos
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '1.0.0';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS privacy_version TEXT DEFAULT '1.0.0';

-- Criar índice para otimizar consultas por versão
CREATE INDEX IF NOT EXISTS idx_profiles_terms_version ON profiles(terms_version);
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_version ON profiles(privacy_version);

-- Comentários para documentar os campos
COMMENT ON COLUMN profiles.terms_accepted_at IS 'Data e hora em que o usuário aceitou os termos de uso';
COMMENT ON COLUMN profiles.terms_version IS 'Versão dos termos de uso aceitos pelo usuário';
COMMENT ON COLUMN profiles.privacy_accepted_at IS 'Data e hora em que o usuário aceitou a política de privacidade';
COMMENT ON COLUMN profiles.privacy_version IS 'Versão da política de privacidade aceita pelo usuário';

-- Função para verificar se o usuário precisa aceitar os termos novamente
CREATE OR REPLACE FUNCTION needs_terms_acceptance(
    user_id_param UUID,
    current_terms_version TEXT DEFAULT '1.0.0',
    current_privacy_version TEXT DEFAULT '1.0.0'
) RETURNS BOOLEAN AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Buscar o perfil do usuário
    SELECT 
        terms_accepted_at,
        terms_version,
        privacy_accepted_at,
        privacy_version
    INTO user_profile
    FROM profiles
    WHERE id = user_id_param;
    
    -- Se não encontrou o perfil, precisa aceitar
    IF user_profile IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Se não aceitou os termos ou aceitou versão antiga, precisa aceitar novamente
    IF user_profile.terms_accepted_at IS NULL OR 
       user_profile.terms_version != current_terms_version OR
       user_profile.privacy_accepted_at IS NULL OR
       user_profile.privacy_version != current_privacy_version THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar o aceite dos termos
CREATE OR REPLACE FUNCTION update_terms_acceptance(
    user_id_param UUID,
    terms_version_param TEXT DEFAULT '1.0.0',
    privacy_version_param TEXT DEFAULT '1.0.0'
) RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET 
        terms_accepted_at = NOW(),
        terms_version = terms_version_param,
        privacy_accepted_at = NOW(),
        privacy_version = privacy_version_param,
        updated_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql; 