-- =====================================================
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY)
-- =====================================================

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA TABELA PLANS
-- =====================================================
-- Todos podem ver planos ativos
CREATE POLICY "Plans are viewable by everyone" ON plans
    FOR SELECT USING (is_active = true);

-- Apenas admins podem modificar planos
CREATE POLICY "Plans are modifiable by admins only" ON plans
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS PARA TABELA SUBSCRIPTIONS
-- =====================================================
-- Usuários podem ver apenas suas próprias assinaturas
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar suas próprias assinaturas
CREATE POLICY "Users can create own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias assinaturas
CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS PARA TABELA PROPERTIES
-- =====================================================
-- Todos podem ver propriedades aprovadas
CREATE POLICY "Properties are viewable by everyone when approved" ON properties
    FOR SELECT USING (status = 'approved');

-- Usuários podem ver suas próprias propriedades (qualquer status)
CREATE POLICY "Users can view own properties" ON properties
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar propriedades
CREATE POLICY "Users can create properties" ON properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias propriedades (apenas se não aprovadas)
CREATE POLICY "Users can update own pending properties" ON properties
    FOR UPDATE USING (
        auth.uid() = user_id 
        AND status IN ('pending', 'rejected')
    );

-- Usuários podem deletar suas próprias propriedades
CREATE POLICY "Users can delete own properties" ON properties
    FOR DELETE USING (auth.uid() = user_id);

-- Admins podem ver todas as propriedades
CREATE POLICY "Admins can view all properties" ON properties
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins podem aprovar/rejeitar propriedades
CREATE POLICY "Admins can update all properties" ON properties
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS PARA TABELA PAYMENTS
-- =====================================================
-- Usuários podem ver apenas seus próprios pagamentos
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios pagamentos
CREATE POLICY "Users can create own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- POLÍTICAS PARA TABELA FAVORITES
-- =====================================================
-- Usuários podem ver apenas seus próprios favoritos
CREATE POLICY "Users can view own favorites" ON favorites
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios favoritos
CREATE POLICY "Users can create own favorites" ON favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios favoritos
CREATE POLICY "Users can delete own favorites" ON favorites
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- POLÍTICAS PARA TABELA MESSAGES
-- =====================================================
-- Usuários podem ver mensagens que enviaram ou receberam
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        auth.uid() = from_user_id OR auth.uid() = to_user_id
    );

-- Usuários podem criar mensagens
CREATE POLICY "Users can create messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Usuários podem marcar como lida mensagens recebidas
CREATE POLICY "Users can update received messages" ON messages
    FOR UPDATE USING (auth.uid() = to_user_id);

-- =====================================================
-- POLÍTICAS PARA TABELA APPOINTMENTS
-- =====================================================
-- Usuários podem ver agendamentos que criaram ou receberam
CREATE POLICY "Users can view own appointments" ON appointments
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = owner_id
    );

-- Usuários podem criar agendamentos
CREATE POLICY "Users can create appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar agendamentos que criaram
CREATE POLICY "Users can update own appointments" ON appointments
    FOR UPDATE USING (auth.uid() = user_id);

-- Proprietários podem confirmar/cancelar agendamentos recebidos
CREATE POLICY "Owners can update received appointments" ON appointments
    FOR UPDATE USING (auth.uid() = owner_id);

-- =====================================================
-- FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'role' = 'service_role';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO PARA OBTER USUÁRIO ATUAL
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 