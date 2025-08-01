-- =====================================================
-- VERIFICAR E CORRIGIR RLS PARA ACTIVE_SESSIONS
-- =====================================================

-- Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions';

-- Se rowsecurity = true, desabilitar RLS
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;

-- Verificar novamente se foi desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions';

-- Verificar se a tabela existe e tem dados
SELECT COUNT(*) as total_sessions FROM active_sessions;

-- Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'active_sessions'; 