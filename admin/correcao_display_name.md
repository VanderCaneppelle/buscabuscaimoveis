# 🔧 Correção: Display Name na Tabela auth.users

## ❌ Problema Identificado

O `display_name` não estava sendo salvo na tabela `auth.users` porque o `signUp` estava sendo chamado sem os **user_metadata**.

---

## 📊 Como Funciona o Supabase Auth

### Estrutura da Tabela `auth.users`:

```sql
auth.users:
├── id (uuid)
├── email (text)
├── encrypted_password (text)
├── email_confirmed_at (timestamp)
├── raw_user_meta_data (jsonb)  ← Aqui ficam os metadados customizados
├── raw_app_meta_data (jsonb)
└── ... outros campos
```

### O que é `raw_user_meta_data`?

É um campo JSON que armazena informações personalizadas do usuário:

```json
{
  "full_name": "João Silva",
  "phone": "47999999999",
  "is_realtor": false
}
```

### Como acessar no SQL:

```sql
-- Via função (recomendado para RLS)
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as display_name,
  raw_user_meta_data->>'phone' as phone
FROM auth.users;
```

---

## ✅ Correção Implementada

### ANTES (Incorreto):

```typescript
// supabase/functions/signup-proxy/index.ts
const { data, error } = await supabasePublic.auth.signUp({
    email,
    password,
    options: {
        emailRedirectTo: 'buscabuscaimoveis://confirm-email'
        // ❌ Sem user_metadata!
    }
});
```

**Resultado:**
- ❌ `raw_user_meta_data` ficava vazio `{}`
- ❌ Não tinha como acessar o nome via SQL
- ❌ Dashboard do Supabase mostrava só o email

---

### AGORA (Correto):

```typescript
// supabase/functions/signup-proxy/index.ts
const { data, error } = await supabasePublic.auth.signUp({
    email,
    password,
    options: {
        emailRedirectTo: 'buscabuscaimoveis://confirm-email',
        data: {  // ✅ Adicionado user_metadata
            full_name: full_name,
            phone: phone,
            is_realtor: !!is_realtor,
        }
    }
});
```

**Resultado:**
- ✅ `raw_user_meta_data` contém `{ "full_name": "João Silva", "phone": "...", "is_realtor": false }`
- ✅ Pode acessar via SQL: `raw_user_meta_data->>'full_name'`
- ✅ Dashboard do Supabase mostra o nome
- ✅ Pode usar em políticas RLS

---

## 📋 O Que Foi Salvo em Cada Lugar

### 1. `auth.users` (Tabela de Autenticação):
```json
{
  "id": "uuid-do-usuario",
  "email": "joao@example.com",
  "raw_user_meta_data": {
    "full_name": "João Silva",      ← AGORA É SALVO!
    "phone": "47999999999",          ← AGORA É SALVO!
    "is_realtor": false              ← AGORA É SALVO!
  }
}
```

### 2. `public.profiles` (Tabela de Perfis):
```json
{
  "id": "uuid-do-usuario",
  "full_name": "João Silva",
  "phone": "47999999999",
  "is_realtor": false,
  "creci": null,
  "company_name": null
}
```

**Ambas as tabelas agora têm os dados!** ✅

---

## 🎯 Benefícios da Correção

### 1. **Display Name no Dashboard Supabase**
```
ANTES:
Email: joao@example.com
Name: (vazio)

AGORA:
Email: joao@example.com
Name: João Silva  ✅
```

### 2. **Acesso via SQL**
```sql
-- Buscar usuários com nome
SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as nome
FROM auth.users
WHERE raw_user_meta_data->>'full_name' LIKE '%João%';
```

### 3. **Políticas RLS mais Inteligentes**
```sql
-- Exemplo: Permitir acesso se nome estiver preenchido
CREATE POLICY "Only users with full name" ON properties
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND (auth.jwt()->>'user_metadata')::jsonb->>'full_name' IS NOT NULL
  );
```

### 4. **Logs e Auditoria**
```sql
-- Ver quem criou o imóvel (nome + email)
SELECT 
  p.title,
  u.email,
  u.raw_user_meta_data->>'full_name' as criador
FROM properties p
JOIN auth.users u ON p.user_id = u.id;
```

---

## 🔍 Como Verificar se Está Funcionando

### Método 1: Dashboard Supabase

1. Vá em **Authentication** → **Users**
2. Clique em um usuário
3. Verifique se o campo **User Metadata** contém:
   ```json
   {
     "full_name": "João Silva",
     "phone": "47999999999",
     "is_realtor": false
   }
   ```

---

### Método 2: SQL Editor

```sql
-- Ver todos os metadados dos usuários
SELECT 
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'full_name' as display_name,
  raw_user_meta_data->>'phone' as phone,
  raw_user_meta_data->>'is_realtor' as is_realtor,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

---

### Método 3: Via API (Frontend)

```javascript
// Após login, verificar metadados
const { data: { user } } = await supabase.auth.getUser();
console.log('User metadata:', user.user_metadata);
// Deve mostrar: { full_name: "João Silva", phone: "...", is_realtor: false }
```

---

## 📝 Comparação: Antes vs Agora

### ANTES:

```typescript
// auth.users
{
  "id": "abc-123",
  "email": "joao@example.com",
  "raw_user_meta_data": {}  ❌ VAZIO
}

// public.profiles
{
  "id": "abc-123",
  "full_name": "João Silva",  ✅ Tinha aqui
  "phone": "47999999999"      ✅ Tinha aqui
}
```

**Problema:** Dados duplicados, mas não acessíveis via `auth.users`

---

### AGORA:

```typescript
// auth.users
{
  "id": "abc-123",
  "email": "joao@example.com",
  "raw_user_meta_data": {
    "full_name": "João Silva",  ✅ AGORA TEM
    "phone": "47999999999",     ✅ AGORA TEM
    "is_realtor": false         ✅ AGORA TEM
  }
}

// public.profiles
{
  "id": "abc-123",
  "full_name": "João Silva",  ✅ Continua tendo
  "phone": "47999999999",     ✅ Continua tendo
  "is_realtor": false,
  "creci": null,
  "company_name": null
}
```

**Vantagem:** Dados acessíveis em ambos os lugares!

---

## 💡 Quando Usar Cada Tabela

### Use `auth.users` (user_metadata) para:
- ✅ Autenticação e autorização
- ✅ Políticas RLS baseadas em metadados
- ✅ Exibir nome no dashboard Supabase
- ✅ Logs e auditoria interna

### Use `public.profiles` para:
- ✅ Dados estendidos do perfil (CRECI, empresa, avatar, etc)
- ✅ Queries complexas com JOINs
- ✅ Dados que o usuário pode atualizar
- ✅ Relações com outras tabelas (properties, favorites, etc)

---

## 🚀 Deploy da Correção

### Passo 1: Atualizar Edge Function

```bash
cd supabase/functions/signup-proxy
supabase functions deploy signup-proxy
```

**Ou via Dashboard:**
1. Functions → signup-proxy → Edit
2. Colar novo código (já está no arquivo `index.ts`)
3. Deploy

---

### Passo 2: Testar com Novo Usuário

```bash
# Cadastrar novo usuário no app
# Verificar no Dashboard: Authentication → Users
# User Metadata deve conter full_name, phone, is_realtor
```

---

### Passo 3: Verificar Usuários Antigos (Opcional)

**Usuários cadastrados ANTES da correção não terão os metadados.**

Para corrigir usuários antigos:

```sql
-- Script para popular user_metadata de usuários antigos
UPDATE auth.users u
SET raw_user_meta_data = jsonb_build_object(
  'full_name', p.full_name,
  'phone', p.phone,
  'is_realtor', p.is_realtor
)
FROM public.profiles p
WHERE u.id = p.id
  AND (u.raw_user_meta_data = '{}'::jsonb 
       OR u.raw_user_meta_data->>'full_name' IS NULL);

-- Verificar quantos foram atualizados
SELECT COUNT(*) FROM auth.users 
WHERE raw_user_meta_data->>'full_name' IS NOT NULL;
```

---

## ⚠️ Importante

### Metadados vs Perfil:

- **`user_metadata`** (auth.users): 
  - Controlado pelo sistema
  - Definido no signup
  - Imutável via cliente (precisa service_role para alterar)
  
- **`profiles`** (public.profiles):
  - Controlado pelo usuário
  - Pode ser atualizado via RLS
  - Fonte da verdade para dados do perfil

**Recomendação:** Use `profiles` como fonte primária e `user_metadata` como backup/cache.

---

## ✅ Checklist de Verificação

Após deploy, verificar:

- [ ] Novo usuário cadastrado
- [ ] Dashboard Supabase mostra nome em "Users"
- [ ] SQL query retorna `full_name` de `auth.users`
- [ ] `public.profiles` continua sendo populada
- [ ] Frontend continua funcionando normalmente

---

**Status: ✅ CORRIGIDO**

Agora o `display_name` (full_name) é salvo corretamente em `auth.users.raw_user_meta_data`! 🎉

Data: ${new Date().toISOString().split('T')[0]}

