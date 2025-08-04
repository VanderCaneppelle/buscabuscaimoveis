-- Teste específico para upload de vídeos
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar se o bucket suporta vídeos
SELECT 
    id,
    name,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'properties';

-- 2. Verificar se há vídeos já no bucket
SELECT 
    name,
    bucket_id,
    metadata,
    created_at
FROM storage.objects 
WHERE bucket_id = 'properties'
AND (name LIKE '%.mp4' OR name LIKE '%.mov' OR name LIKE '%.avi' OR name LIKE '%.m4v' OR name LIKE '%.3gp')
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar políticas específicas para vídeos
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
AND (qual LIKE '%video%' OR with_check LIKE '%video%' OR policyname LIKE '%video%');

-- 4. Teste de inserção de metadados de vídeo (opcional)
-- Descomente se quiser testar inserção manual
/*
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
    'properties',
    'test-video.mp4',
    auth.uid(),
    '{"mimetype": "video/mp4", "size": 0, "duration": 0}'
);

-- Verificar se foi criado
SELECT * FROM storage.objects 
WHERE bucket_id = 'properties' 
AND name = 'test-video.mp4';

-- Limpar arquivo de teste
DELETE FROM storage.objects 
WHERE bucket_id = 'properties' 
AND name = 'test-video.mp4';
*/

-- 5. Verificar estatísticas de vídeos
SELECT 
    COUNT(*) as total_videos,
    COUNT(CASE WHEN name LIKE '%.mp4' THEN 1 END) as mp4_count,
    COUNT(CASE WHEN name LIKE '%.mov' THEN 1 END) as mov_count,
    COUNT(CASE WHEN name LIKE '%.avi' THEN 1 END) as avi_count,
    COUNT(CASE WHEN name LIKE '%.m4v' THEN 1 END) as m4v_count,
    COUNT(CASE WHEN name LIKE '%.3gp' THEN 1 END) as threegp_count
FROM storage.objects 
WHERE bucket_id = 'properties'
AND (name LIKE '%.mp4' OR name LIKE '%.mov' OR name LIKE '%.avi' OR name LIKE '%.m4v' OR name LIKE '%.3gp'); 