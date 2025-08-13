-- Configurar Storage para Stories
-- Execute no SQL Editor do Supabase

-- 1. Criar bucket para stories (se não existir)
-- Nota: Buckets devem ser criados via Dashboard do Supabase
-- Vá em Storage > New Bucket > Nome: "stories" > Public bucket

-- 2. Configurar políticas RLS para o bucket stories
-- Permitir upload apenas para admins
CREATE POLICY "Admins can upload stories" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'stories' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Permitir visualização pública
CREATE POLICY "Public can view stories" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

-- Permitir atualização apenas para admins
CREATE POLICY "Admins can update stories" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'stories' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Permitir exclusão apenas para admins
CREATE POLICY "Admins can delete stories" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'stories' AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    ); 