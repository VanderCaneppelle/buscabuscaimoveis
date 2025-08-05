-- Sistema de Aprovação de Anúncios - Versão Corrigida
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar colunas de aprovação na tabela properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Adicionar coluna is_admin na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_approved_at ON properties(approved_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- 4. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
DROP POLICY IF EXISTS "Admins can update property status" ON properties;
DROP POLICY IF EXISTS "Users can view approved properties" ON properties;
DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Users can create properties" ON properties;
DROP POLICY IF EXISTS "Users can update own pending properties" ON properties;

-- 5. Criar novas políticas RLS
-- Permitir que admins vejam todos os anúncios
CREATE POLICY "Admins can view all properties" ON properties
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Permitir que admins atualizem status de anúncios
CREATE POLICY "Admins can update property status" ON properties
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Permitir que usuários vejam apenas anúncios aprovados
CREATE POLICY "Users can view approved properties" ON properties
    FOR SELECT USING (status = 'approved');

-- Permitir que usuários vejam seus próprios anúncios (independente do status)
CREATE POLICY "Users can view own properties" ON properties
    FOR SELECT USING (user_id = auth.uid());

-- Permitir que usuários criem anúncios
CREATE POLICY "Users can create properties" ON properties
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Permitir que usuários atualizem seus próprios anúncios (apenas se ainda não aprovados)
CREATE POLICY "Users can update own pending properties" ON properties
    FOR UPDATE USING (
        user_id = auth.uid() 
        AND status = 'pending'
    );

-- 6. Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para obter estatísticas de anúncios (apenas para admins)
CREATE OR REPLACE FUNCTION get_property_stats()
RETURNS TABLE (
    total_count BIGINT,
    pending_count BIGINT,
    approved_count BIGINT,
    rejected_count BIGINT
) AS $$
BEGIN
    -- Verificar se usuário é admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver estatísticas';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
    FROM properties;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger para atualizar approved_at quando status for aprovado
CREATE OR REPLACE FUNCTION update_approval_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        NEW.approved_at = NOW();
        NEW.approved_by = auth.uid();
    END IF;
    
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        NEW.rejected_at = NOW();
        NEW.rejected_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Criar trigger
DROP TRIGGER IF EXISTS trigger_update_approval_timestamp ON properties;
CREATE TRIGGER trigger_update_approval_timestamp
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION update_approval_timestamp();

-- 10. Comentários para documentação
COMMENT ON COLUMN properties.status IS 'Status do anúncio: pending, approved, rejected';
COMMENT ON COLUMN properties.approved_at IS 'Data/hora da aprovação';
COMMENT ON COLUMN properties.approved_by IS 'ID do usuário que aprovou';
COMMENT ON COLUMN properties.rejected_at IS 'Data/hora da rejeição';
COMMENT ON COLUMN properties.rejected_by IS 'ID do usuário que rejeitou';
COMMENT ON COLUMN properties.rejection_reason IS 'Motivo da rejeição';
COMMENT ON COLUMN profiles.is_admin IS 'Indica se o usuário é administrador';

-- 11. Exemplo de como tornar um usuário admin (execute manualmente)
-- UPDATE profiles SET is_admin = true WHERE email = 'admin@exemplo.com';

-- ✅ Script executado com sucesso!
-- Agora você pode:
-- 1. Tornar um usuário admin: UPDATE profiles SET is_admin = true WHERE email = 'seu-email@exemplo.com';
-- 2. Acessar o painel administrativo: admin/index.html 