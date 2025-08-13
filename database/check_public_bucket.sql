-- Verificar e configurar bucket stories como público
-- Execute no SQL Editor do Supabase

-- 1. Verificar configuração atual do bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'stories';

-- 2. Se não estiver público, tornar público
UPDATE storage.buckets 
SET public = true
WHERE id = 'stories';

-- 3. Verificar novamente
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'stories'; 