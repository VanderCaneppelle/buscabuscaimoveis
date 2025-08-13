-- Desabilitar RLS temporariamente para o bucket stories
-- Execute no SQL Editor do Supabase

-- 1. Desabilitar RLS na tabela storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 3. Remover todas as políticas existentes (opcional)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to stories" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to stories" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from stories" ON storage.objects;
DROP POLICY IF EXISTS "Public can view stories" ON storage.objects;

-- 4. Verificar se não há mais políticas
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'; 