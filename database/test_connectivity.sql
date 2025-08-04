-- Teste de conectividade e configuração do Supabase Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Teste básico de conectividade
DO $$
BEGIN
    RAISE NOTICE 'Teste de conectividade iniciado...';
    
    -- Verificar se conseguimos acessar o storage
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'properties') THEN
        RAISE NOTICE '✅ Bucket "properties" encontrado';
    ELSE
        RAISE NOTICE '❌ Bucket "properties" NÃO encontrado';
    END IF;
    
    -- Verificar configurações do bucket
    SELECT 
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    FROM storage.buckets 
    WHERE id = 'properties';
    
    RAISE NOTICE 'Teste de conectividade concluído';
END $$;

-- 2. Verificar políticas RLS
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 3. Teste de inserção de arquivo pequeno (opcional)
-- Descomente se quiser testar upload real
/*
-- Criar um arquivo de teste pequeno
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
    'properties',
    'test-connectivity.txt',
    auth.uid(),
    '{"mimetype": "text/plain", "size": 0}'
);

-- Verificar se foi criado
SELECT * FROM storage.objects 
WHERE bucket_id = 'properties' 
AND name = 'test-connectivity.txt';

-- Limpar arquivo de teste
DELETE FROM storage.objects 
WHERE bucket_id = 'properties' 
AND name = 'test-connectivity.txt';
*/ 