-- Criar bucket para propriedades
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'properties',
    'properties',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp']
) ON CONFLICT (id) DO NOTHING;

-- Política para permitir upload de arquivos para usuários autenticados
CREATE POLICY "Usuários autenticados podem fazer upload de arquivos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    );

-- Política para permitir visualização pública dos arquivos
CREATE POLICY "Arquivos são públicos" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties');

-- Política para permitir que usuários deletem seus próprios arquivos
CREATE POLICY "Usuários podem deletar seus arquivos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    );

-- Política para permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Usuários podem atualizar seus arquivos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'properties' AND 
        auth.role() = 'authenticated'
    ); 