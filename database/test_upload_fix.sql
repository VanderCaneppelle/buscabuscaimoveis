-- Teste para verificar configuração do bucket após correções
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o bucket existe e está configurado corretamente
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'properties';

-- 2. Verificar políticas RLS para o bucket
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

-- 3. Verificar se há arquivos no bucket (opcional)
SELECT 
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    last_accessed_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'properties'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Teste de inserção de política (se necessário)
-- Descomente se precisar recriar as políticas
/*
-- Política para permitir upload de arquivos para usuários autenticados
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de arquivos" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de arquivos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    );

-- Política para permitir visualização pública dos arquivos
DROP POLICY IF EXISTS "Arquivos são públicos" ON storage.objects;
CREATE POLICY "Arquivos são públicos" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties');

-- Política para permitir que usuários deletem seus próprios arquivos
DROP POLICY IF EXISTS "Usuários podem deletar seus arquivos" ON storage.objects;
CREATE POLICY "Usuários podem deletar seus arquivos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    );

-- Política para permitir que usuários atualizem seus próprios arquivos
DROP POLICY IF EXISTS "Usuários podem atualizar seus arquivos" ON storage.objects;
CREATE POLICY "Usuários podem atualizar seus arquivos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    );
*/ 