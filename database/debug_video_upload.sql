-- Debug específico para upload de vídeos
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar configuração do bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'properties';

-- 2. Verificar se há vídeos no bucket
SELECT 
    name,
    bucket_id,
    metadata,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'properties'
AND (name LIKE '%.mp4' OR name LIKE '%.mov' OR name LIKE '%.avi' OR name LIKE '%.m4v' OR name LIKE '%.3gp')
ORDER BY created_at DESC
LIMIT 5;

-- 3. Verificar políticas RLS para storage
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 4. Teste de inserção manual de metadados de vídeo (para debug)
-- Descomente se quiser testar inserção manual
/*
DO $$
BEGIN
    -- Tentar inserir um registro de teste
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
        'properties',
        'test-video-debug.mp4',
        auth.uid(),
        '{"mimetype": "video/mp4", "size": 0, "duration": 0, "test": true}'
    );
    
    RAISE NOTICE '✅ Inserção manual bem-sucedida';
    
    -- Verificar se foi criado
    IF EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'properties' 
        AND name = 'test-video-debug.mp4'
    ) THEN
        RAISE NOTICE '✅ Arquivo de teste encontrado no bucket';
    ELSE
        RAISE NOTICE '❌ Arquivo de teste NÃO encontrado';
    END IF;
    
    -- Limpar arquivo de teste
    DELETE FROM storage.objects 
    WHERE bucket_id = 'properties' 
    AND name = 'test-video-debug.mp4';
    
    RAISE NOTICE '🧹 Arquivo de teste removido';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro na inserção manual: %', SQLERRM;
END $$;
*/

-- 5. Verificar estatísticas gerais do bucket
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' THEN 1 END) as images,
    COUNT(CASE WHEN name LIKE '%.mp4' OR name LIKE '%.mov' OR name LIKE '%.avi' OR name LIKE '%.m4v' OR name LIKE '%.3gp' THEN 1 END) as videos,
    COUNT(CASE WHEN name LIKE '%.mp4' THEN 1 END) as mp4_files,
    COUNT(CASE WHEN name LIKE '%.mov' THEN 1 END) as mov_files
FROM storage.objects 
WHERE bucket_id = 'properties';

-- 6. Verificar permissões do usuário atual
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;

-- 7. Verificar se o bucket está acessível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'properties') THEN
        RAISE NOTICE '✅ Bucket "properties" existe e está acessível';
    ELSE
        RAISE NOTICE '❌ Bucket "properties" NÃO existe ou não está acessível';
    END IF;
END $$; 