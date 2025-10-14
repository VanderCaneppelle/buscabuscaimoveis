-- =====================================================
-- SISTEMA DE NOTIFICAÇÕES IN-APP
-- =====================================================
-- Este script cria a estrutura completa para o sistema de notificações in-app
-- Data: 2025-10-14
-- =====================================================

-- =====================================================
-- TABELA DE NOTIFICAÇÕES IN-APP
-- =====================================================
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'property_approved', 'property_rejected', 'plan_expiring', 'whatsapp_contact'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Dados adicionais (property_id, reason, etc)
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMENTÁRIOS DAS COLUNAS
-- =====================================================
COMMENT ON TABLE in_app_notifications IS 'Armazena notificações in-app para usuários';
COMMENT ON COLUMN in_app_notifications.type IS 'Tipo da notificação: property_approved, property_rejected, plan_expiring, whatsapp_contact';
COMMENT ON COLUMN in_app_notifications.data IS 'Dados adicionais em formato JSON (property_id, reason, plan_name, etc)';
COMMENT ON COLUMN in_app_notifications.read IS 'Indica se a notificação foi lida pelo usuário';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON in_app_notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON in_app_notifications(user_id, read) WHERE read = false;

-- =====================================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER PARA updated_at
-- =====================================================
DROP TRIGGER IF EXISTS update_notifications_updated_at ON in_app_notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON in_app_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_updated_at();

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own notifications" ON in_app_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON in_app_notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON in_app_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON in_app_notifications;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Users can view own notifications" ON in_app_notifications
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Usuários podem atualizar apenas suas próprias notificações (marcar como lida)
CREATE POLICY "Users can update own notifications" ON in_app_notifications
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role pode inserir notificações (usado pelo backend)
CREATE POLICY "Service role can insert notifications" ON in_app_notifications
    FOR INSERT 
    WITH CHECK (true);

-- Admins podem ver todas as notificações (opcional - para relatórios)
CREATE POLICY "Admins can view all notifications" ON in_app_notifications
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- =====================================================
-- FUNÇÃO AUXILIAR: Limpar notificações antigas
-- =====================================================
-- Remove notificações lidas com mais de 30 dias
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM in_app_notifications
    WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Notificações antigas removidas com sucesso';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove notificações lidas com mais de 30 dias. Execute manualmente ou agende via cron.';

-- =====================================================
-- FUNÇÃO AUXILIAR: Contar notificações não lidas
-- =====================================================
CREATE OR REPLACE FUNCTION count_unread_notifications(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM in_app_notifications
    WHERE user_id = p_user_id AND read = false;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION count_unread_notifications IS 'Retorna o número de notificações não lidas de um usuário';

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Verificar se a tabela foi criada corretamente
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'in_app_notifications'
    ) THEN
        RAISE NOTICE '✅ Tabela in_app_notifications criada com sucesso!';
    ELSE
        RAISE EXCEPTION '❌ Erro ao criar tabela in_app_notifications';
    END IF;
END $$;

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================
-- Execute este script no SQL Editor do Supabase:
-- 1. Copie todo o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase
-- 3. Execute o script
-- 4. Verifique se não há erros
-- 5. Confirme que a mensagem "✅ Tabela in_app_notifications criada com sucesso!" apareceu

-- PARA LIMPAR NOTIFICAÇÕES ANTIGAS (opcional):
-- SELECT cleanup_old_notifications();

-- PARA CONTAR NOTIFICAÇÕES NÃO LIDAS DE UM USUÁRIO:
-- SELECT count_unread_notifications('uuid-do-usuario');

