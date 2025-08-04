-- Atualizar bucket para incluir novos formatos de vídeo
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'video/mp4', 
    'video/quicktime', 
    'video/x-msvideo',
    'video/3gpp'
]
WHERE id = 'properties';

-- Verificar se a atualização foi aplicada
SELECT id, name, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'properties'; 