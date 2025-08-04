# Configuração do Storage no Supabase

## 1. Criar Bucket no Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **Storage** no menu lateral
4. Clique em **Create a new bucket**
5. Configure:
   - **Name**: `properties`
   - **Public bucket**: ✅ Marque como público
   - **File size limit**: `50MB`
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `video/mp4`
     - `video/quicktime`
     - `video/x-msvideo`

## 2. Configurar Políticas de Segurança

Execute o script SQL `create_storage_bucket.sql` no SQL Editor do Supabase:

```sql
-- Criar bucket para propriedades
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'properties',
    'properties',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
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
```

## 3. Verificar Configuração

Após executar o script, verifique se:

1. O bucket `properties` foi criado
2. As políticas foram aplicadas corretamente
3. O bucket está marcado como público
4. Os tipos MIME estão configurados

## 4. Testar Upload

Para testar se tudo está funcionando:

1. Execute o app
2. Tente criar um anúncio com fotos
3. Verifique se as imagens aparecem no bucket do Supabase
4. Confirme se as URLs das imagens estão sendo salvas na tabela `properties`

## 5. Solução de Problemas

### Erro de Permissão
Se receber erro de permissão, verifique se:
- O usuário está autenticado
- As políticas estão configuradas corretamente
- O bucket existe e está público

### Erro de Upload
Se o upload falhar:
- Verifique o tamanho do arquivo (máximo 50MB)
- Confirme se o tipo MIME está permitido
- Verifique a conexão com a internet

### Arquivos não aparecem
Se os arquivos não aparecem no bucket:
- Verifique se o bucket foi criado corretamente
- Confirme se as políticas permitem INSERT
- Verifique os logs do Supabase para erros 