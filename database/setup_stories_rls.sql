-- Configurar RLS para tabela stories
-- Execute no SQL Editor do Supabase

-- 1. Habilitar RLS na tabela stories (se não estiver habilitado)
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 2. Política para permitir visualização pública de stories ativos
CREATE POLICY "Public can view active stories" ON stories
    FOR SELECT USING (status = 'active');

-- 3. Política para permitir que admins insiram stories
CREATE POLICY "Admins can insert stories" ON stories
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 4. Política para permitir que admins atualizem stories
CREATE POLICY "Admins can update stories" ON stories
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 5. Política para permitir que admins deletem stories
CREATE POLICY "Admins can delete stories" ON stories
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- 6. Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'stories'; 