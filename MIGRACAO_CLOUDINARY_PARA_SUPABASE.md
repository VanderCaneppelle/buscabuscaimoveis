# 🔄 Migração de Upload de Imagens: Cloudinary → Supabase Storage

## 📋 Resumo das Mudanças

As imagens dos anúncios agora são armazenadas no **Supabase Storage** ao invés
do **Cloudinary**.

---

## ✅ O que foi alterado

### 1. **Nova Função de Upload**

- **Arquivo:** `lib/mediaServiceOptimized.js`
- **Função:** `uploadImageToSupabase()`
- **O que faz:**
  - Lê a imagem como base64
  - Converte para Uint8Array
  - Faz upload para Supabase Storage
  - Retorna URL pública no formato compatível (objeto com `secure_url`)

### 2. **Modificação do Fluxo Principal**

- **Arquivo:** `lib/mediaServiceOptimized.js`
- **Função:** `uploadToSupabase()`
- **Mudança:** Agora chama `uploadImageToSupabase()` para imagens ao invés de
  `uploadImageToCloudinary()`

### 3. **Função de Delete Atualizada**

- **Arquivo:** `lib/propertyService.js`
- **Função:** `deleteMedia()`
- **O que faz:**
  - Detecta automaticamente se a URL é do Supabase Storage ou Cloudinary
  - Deleta do serviço apropriado
  - Mantém compatibilidade com imagens antigas do Cloudinary

### 4. **Função de Delete do Supabase Melhorada**

- **Arquivo:** `lib/mediaServiceOptimized.js`
- **Função:** `deleteFromSupabase()`
- **Melhoria:** Agora extrai corretamente o caminho completo do arquivo da URL

---

## 🔧 Configuração Necessária

### 1. **Bucket no Supabase Storage**

O bucket `properties` já deve estar configurado. Se não estiver, execute:

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
```

### 2. **Políticas RLS (Row Level Security)**

As políticas já devem estar configuradas. Verifique executando:

```sql
-- Verificar políticas existentes
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%properties%';
```

Se não existirem, execute o script `database/create_storage_bucket.sql`.

---

## 📊 Formato de URLs

### **Antes (Cloudinary):**

```
https://res.cloudinary.com/djtl3cvkz/image/upload/v1234567890/media/image.jpg
```

### **Agora (Supabase Storage):**

```
https://[project].supabase.co/storage/v1/object/public/properties/media/1234567890-abc123.jpg
```

---

## 🔄 Compatibilidade

### **Retorno da Função de Upload**

A função `uploadImageToSupabase()` retorna um objeto no formato compatível:

```javascript
{
    secure_url: "https://...",  // URL pública do Supabase
    public_url: "https://...",  // Mesma URL (alias)
    url: "https://..."          // Mesma URL (alias)
}
```

Isso mantém compatibilidade com o código existente que espera `url.secure_url`.

### **Função de Delete**

A função `deleteMedia()` detecta automaticamente o tipo de URL:

- **Supabase Storage:** URLs contendo `supabase.co` ou
  `/storage/v1/object/public/`
- **Cloudinary:** URLs contendo `cloudinary.com`

Isso permite deletar imagens antigas do Cloudinary e novas do Supabase Storage.

---

## 🧪 Testes Recomendados

1. **Upload de Imagem:**
   - Criar um novo anúncio com fotos
   - Verificar se as URLs são do Supabase Storage
   - Verificar se as imagens aparecem corretamente

2. **Delete de Imagem:**
   - Deletar um anúncio com imagens
   - Verificar se as imagens são removidas do Supabase Storage

3. **Compatibilidade:**
   - Verificar se anúncios antigos (com imagens do Cloudinary) ainda funcionam
   - Verificar se a deleção funciona para ambos os tipos de URL

---

## 📝 Notas Importantes

1. **Imagens Antigas:** Imagens já armazenadas no Cloudinary continuarão
   funcionando normalmente
2. **Vídeos:** Continuam usando Supabase Storage (não houve mudança)
3. **Stories:** Continuam usando Cloudinary (não foi alterado)
4. **Bucket:** O bucket `properties` deve estar público para permitir
   visualização das imagens

---

## 🚨 Possíveis Problemas e Soluções

### **Erro: "Bucket não encontrado"**

- **Solução:** Verificar se o bucket `properties` existe no Supabase Dashboard
- **Comando SQL:** `SELECT * FROM storage.buckets WHERE id = 'properties';`

### **Erro: "Permission denied"**

- **Solução:** Verificar se as políticas RLS estão configuradas corretamente
- **Script:** Execute `database/create_storage_bucket.sql`

### **Erro: "File size limit exceeded"**

- **Solução:** Verificar o limite do bucket (padrão: 50MB)
- **Ajuste:** Aumentar `file_size_limit` no bucket se necessário

### **Imagens não aparecem**

- **Solução:** Verificar se o bucket está marcado como público
- **Comando SQL:**
  `UPDATE storage.buckets SET public = true WHERE id = 'properties';`

---

## 📚 Arquivos Modificados

1. `lib/mediaServiceOptimized.js`
   - Adicionada função `uploadImageToSupabase()`
   - Modificada função `uploadToSupabase()`
   - Melhorada função `deleteFromSupabase()`
   - Mantida função `uploadImageToCloudinary()` (deprecated)

2. `lib/propertyService.js`
   - Adicionada função `deleteMedia()` (detecta tipo de URL)
   - Mantida função `deleteFromCloudinary()` (compatibilidade)

---

## ✅ Checklist de Migração

- [x] Criar função `uploadImageToSupabase()`
- [x] Modificar `uploadToSupabase()` para usar Supabase Storage
- [x] Atualizar função de delete para detectar tipo de URL
- [x] Melhorar extração de caminho na função `deleteFromSupabase()`
- [x] Manter compatibilidade com formato de retorno
- [ ] Verificar se bucket `properties` está configurado
- [ ] Verificar se políticas RLS estão ativas
- [ ] Testar upload de imagens
- [ ] Testar delete de imagens
- [ ] Verificar compatibilidade com imagens antigas
