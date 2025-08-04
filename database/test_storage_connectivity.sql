-- Teste de conectividade com Supabase Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o bucket existe e está acessível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'properties') THEN
        RAISE NOTICE '✅ Bucket "properties" existe e está acessível';
    ELSE
        RAISE NOTICE '❌ Bucket "properties" NÃO existe ou não está acessível';
    END IF;
END $$;

-- 2. Verificar configurações do bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'properties';

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

-- 4. Verificar permissões do usuário atual
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;

-- 5. Teste de inserção manual (opcional)
-- Descomente se quiser testar inserção manual
/*
DO $$
BEGIN
    -- Tentar inserir um registro de teste
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
        'properties',
        'test-connectivity.txt',
        auth.uid(),
        '{"mimetype": "text/plain", "size": 0, "test": true}'
    );
    
    RAISE NOTICE '✅ Inserção manual bem-sucedida';
    
    -- Verificar se foi criado
    IF EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'properties' 
        AND name = 'test-connectivity.txt'
    ) THEN
        RAISE NOTICE '✅ Arquivo de teste encontrado no bucket';
    ELSE
        RAISE NOTICE '❌ Arquivo de teste NÃO encontrado';
    END IF;
    
    -- Limpar arquivo de teste
    DELETE FROM storage.objects 
    WHERE bucket_id = 'properties' 
    AND name = 'test-connectivity.txt';
    
    RAISE NOTICE '🧹 Arquivo de teste removido';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro na inserção manual: %', SQLERRM;
END $$;
*/

-- 6. Verificar estatísticas do bucket
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN name LIKE '%.jpg' OR name LIKE '%.jpeg' OR name LIKE '%.png' THEN 1 END) as images,
    COUNT(CASE WHEN name LIKE '%.mp4' OR name LIKE '%.mov' OR name LIKE '%.avi' THEN 1 END) as videos
FROM storage.objects 
WHERE bucket_id = 'properties';

-- 7. Verificar arquivos mais recentes
SELECT 
    name,
    bucket_id,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'properties'
ORDER BY created_at DESC
LIMIT 10;

-- 8. Verificar se há erros de permissão
DO $$
BEGIN
    -- Tentar acessar o storage
    IF EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'properties' 
        LIMIT 1
    ) THEN
        RAISE NOTICE '✅ Acesso ao storage OK';
    ELSE
        RAISE NOTICE '⚠️ Nenhum arquivo encontrado no bucket (pode ser normal se estiver vazio)';
    END IF;
END $$; 