-- =====================================================
-- SISTEMA DE BLOQUEIO DE ACESSO SIMULTÂNEO
-- =====================================================

-- Tabela para controlar sessões ativas
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_info TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, session_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active);

-- Função para registrar nova sessão
CREATE OR REPLACE FUNCTION register_session(
    p_session_id TEXT,
    p_device_info TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_existing_sessions_count INTEGER;
BEGIN
    -- Obter ID do usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Verificar se já existe uma sessão ativa para este usuário
    SELECT COUNT(*) INTO v_existing_sessions_count
    FROM active_sessions
    WHERE user_id = v_user_id AND is_active = true;
    
    -- Se já existe uma sessão ativa, invalidar todas as outras
    IF v_existing_sessions_count > 0 THEN
        UPDATE active_sessions 
        SET is_active = false, last_activity = NOW()
        WHERE user_id = v_user_id AND is_active = true;
    END IF;
    
    -- Registrar nova sessão
    INSERT INTO active_sessions (user_id, session_id, device_info, ip_address)
    VALUES (v_user_id, p_session_id, p_device_info, p_ip_address)
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET 
        is_active = true,
        last_activity = NOW(),
        device_info = EXCLUDED.device_info,
        ip_address = EXCLUDED.ip_address;
        
    RAISE NOTICE 'Nova sessão registrada para usuário %', v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se a sessão atual é válida
CREATE OR REPLACE FUNCTION is_session_valid(p_session_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_session_exists BOOLEAN;
BEGIN
    -- Obter ID do usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se a sessão existe e está ativa
    SELECT EXISTS(
        SELECT 1 FROM active_sessions 
        WHERE user_id = v_user_id 
        AND session_id = p_session_id 
        AND is_active = true
    ) INTO v_session_exists;
    
    -- Se a sessão existe, atualizar last_activity
    IF v_session_exists THEN
        UPDATE active_sessions 
        SET last_activity = NOW()
        WHERE user_id = v_user_id 
        AND session_id = p_session_id 
        AND is_active = true;
    END IF;
    
    RETURN v_session_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para invalidar sessão atual
CREATE OR REPLACE FUNCTION invalidate_current_session()
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Obter ID do usuário atual
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;
    
    -- Invalidar todas as sessões do usuário
    UPDATE active_sessions 
    SET is_active = false, last_activity = NOW()
    WHERE user_id = v_user_id AND is_active = true;
    
    RAISE NOTICE 'Sessões invalidadas para usuário %', v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar sessões antigas (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Remover sessões inativas com mais de 30 dias
    DELETE FROM active_sessions 
    WHERE is_active = false 
    AND last_activity < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Removidas % sessões antigas', v_deleted_count;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para invalidar sessões antigas quando nova sessão é criada
CREATE OR REPLACE FUNCTION handle_new_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Invalidar todas as outras sessões do mesmo usuário
    UPDATE active_sessions 
    SET is_active = false, last_activity = NOW()
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_active = true;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar quando nova sessão é inserida
CREATE TRIGGER trigger_handle_new_session
    AFTER INSERT ON active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_session();

-- RLS para active_sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own sessions" ON active_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON active_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Apenas funções podem inserir/delete
CREATE POLICY "Only functions can insert sessions" ON active_sessions
    FOR INSERT WITH CHECK (false);

CREATE POLICY "Only functions can delete sessions" ON active_sessions
    FOR DELETE USING (false);

-- =====================================================
-- FUNÇÃO PARA VERIFICAR SESSÃO EM TODAS AS REQUISIÇÕES
-- =====================================================

-- Função que será chamada antes de cada operação
CREATE OR REPLACE FUNCTION check_session_validity()
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id TEXT;
    v_is_valid BOOLEAN;
BEGIN
    -- Obter session_id do JWT (você precisará implementar isso)
    -- Por enquanto, vamos assumir que a sessão é válida se o usuário está autenticado
    IF auth.uid() IS NOT NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- EXEMPLO DE USO
-- =====================================================

/*
-- Para registrar uma nova sessão (chamar após login):
SELECT register_session('session_123', 'iPhone 12', '192.168.1.1');

-- Para verificar se a sessão é válida:
SELECT is_session_valid('session_123');

-- Para invalidar a sessão atual (chamar no logout):
SELECT invalidate_current_session();

-- Para limpar sessões antigas (executar periodicamente):
SELECT cleanup_old_sessions();
*/ 