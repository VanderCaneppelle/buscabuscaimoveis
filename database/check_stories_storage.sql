-- Verificar e corrigir políticas do storage de stories
-- Execute no SQL Editor do Supabase

-- 1. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'stories';

-- 2. Verificar políticas existentes
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
WHERE tablename = 'objects' 
AND schemaname = 'storage';

-- 3. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Admins can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Public can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update stories" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete stories" ON storage.objects;

-- 4. Criar novas políticas mais permissivas para teste
-- Permitir upload para qualquer usuário autenticado
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' AND
        auth.role() = 'authenticated'
    );

-- Permitir visualização pública
CREATE POLICY "Public can view stories" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Allow authenticated updates" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'stories' AND
        auth.role() = 'authenticated'
    );

-- Permitir exclusão para usuários autenticados
CREATE POLICY "Allow authenticated deletes" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stories' AND
        auth.role() = 'authenticated'
    );

-- 5. Verificar se as políticas foram criadas
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%stories%'; 