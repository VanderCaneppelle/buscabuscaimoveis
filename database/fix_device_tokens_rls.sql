-- Corrigir políticas RLS da tabela device_tokens
-- Este script permite que o sistema registre tokens sem autenticação

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can manage their own device tokens" ON device_tokens;
DROP POLICY IF EXISTS "System can read all device tokens" ON device_tokens;

-- Criar política mais permissiva para INSERT
CREATE POLICY "Allow device token registration" ON device_tokens
    FOR INSERT WITH CHECK (true);

-- Criar política para UPDATE (usuários podem atualizar seus próprios tokens)
CREATE POLICY "Users can update their own device tokens" ON device_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Criar política para SELECT (sistema pode ler todos os tokens)
CREATE POLICY "System can read all device tokens" ON device_tokens
    FOR SELECT USING (true);

-- Criar política para DELETE (usuários podem deletar seus próprios tokens)
CREATE POLICY "Users can delete their own device tokens" ON device_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'device_tokens';
