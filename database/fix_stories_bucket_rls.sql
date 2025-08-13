-- Corrigir políticas RLS do bucket stories
-- Execute no SQL Editor do Supabase

-- 1. Verificar políticas atuais
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
WHERE tablename LIKE '%stories%';

-- 2. Remover políticas existentes do bucket stories (se houver)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view stories" ON storage.objects;

-- 3. Criar políticas corretas para o bucket stories
-- Política para permitir uploads autenticados
CREATE POLICY "Allow authenticated uploads to stories" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'stories');

-- Política para permitir atualizações autenticadas
CREATE POLICY "Allow authenticated updates to stories" ON storage.objects
    FOR UPDATE 
    TO authenticated
    USING (bucket_id = 'stories')
    WITH CHECK (bucket_id = 'stories');

-- Política para permitir exclusões autenticadas
CREATE POLICY "Allow authenticated deletes from stories" ON storage.objects
    FOR DELETE 
    TO authenticated
    USING (bucket_id = 'stories');

-- Política para permitir visualização pública
CREATE POLICY "Public can view stories" ON storage.objects
    FOR SELECT 
    TO public
    USING (bucket_id = 'stories');

-- 4. Verificar se as políticas foram criadas
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
WHERE tablename = 'objects' AND policyname LIKE '%stories%';

-- 5. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage'; 