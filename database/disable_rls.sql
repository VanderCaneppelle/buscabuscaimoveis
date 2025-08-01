-- =====================================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTE
-- =====================================================

-- Desabilitar RLS na tabela active_sessions
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions'; 