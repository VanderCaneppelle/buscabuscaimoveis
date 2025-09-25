-- Verificar estrutura da tabela profiles
-- Execute este SQL no Supabase SQL Editor para verificar se existe coluna email

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- NOTA: Triggers em auth.users não funcionam no Supabase
-- Use apenas a função RPC get_user_email() para buscar emails
