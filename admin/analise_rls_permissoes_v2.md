# Análise RLS e Permissões - Situação Real

## 📋 Situação Atual (CORRIGIDA)

- ✅ Edge Function signup-proxy foi **excluída**
- ✅ **Apenas o frontend** cria o perfil (`SignUpForm.js`)
- ❌ RLS desabilitado em `profiles` e `active_sessions`
- 🎯 Não há duplicação!

---

## 🔍 Análise Detalhada

### 1. **Tabela `profiles`**

#### Situação Real:
```javascript
// components/SignUpForm.js (linhas 76-77)
const { data, error } = await supabase.functions.invoke('signup-proxy', {
    body: { email: normalizedEmail, password: formData.password }
});
```
⚠️ **Isso vai FALHAR** porque a Edge Function não existe mais!

```javascript
// components/SignUpForm.js (linhas 105-114)
const { error: profileError } = await supabase
    .from('profiles')
    .insert({
        id: userId,
        full_name: formData.fullName,
        phone: formData.phone,
        is_realtor: formData.isRealtor,
        creci: formData.isRealtor ? formData.creci : null,
        company_name: formData.isRealtor ? formData.companyName : null,
    });
```
✅ Isso está criando o perfil

#### Operações Necessárias:
- **INSERT**: Usuário precisa criar seu próprio perfil (primeira vez)
- **SELECT**: Ler perfils (próprio e de outros anunciantes)
- **UPDATE**: Atualizar apenas o próprio perfil
- **DELETE**: Não necessário

---

### 2. **Tabela `active_sessions`**

#### Operações Necessárias (lib/sessionManager.js):
- **SELECT**: Usuário lê suas próprias sessões
- **INSERT**: Via função `register_session()` (SECURITY DEFINER)
- **UPDATE**: Via funções do sistema
- **DELETE**: Via função `cleanup_inactive_sessions()` (SECURITY DEFINER)

---

## ✅ Solução Correta para SUA Situação

### **Passo 1: Corrigir `SignUpForm.js`**

O código está chamando uma Edge Function que não existe mais!

```javascript
// ANTES (linhas 75-78) - VAI FALHAR
const { data, error } = await supabase.functions.invoke('signup-proxy', {
    body: { email: normalizedEmail, password: formData.password }
});

// DEPOIS - Usar auth.signUp direto
const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: formData.password,
    options: {
        emailRedirectTo: 'buscabuscaimoveis://confirm-email',
    }
});
```

Depois ajustar a validação:
```javascript
// ANTES (linha 86)
if (!data?.success) {
    if (data?.code === 'EMAIL_TAKEN') { ... }
    // etc
}

// DEPOIS
if (error) {
    if (error.message.includes('User already registered')) {
        Alert.alert('E-mail já cadastrado', 'Este e-mail já possui uma conta. Faça login.');
        return;
    }
    Alert.alert('Erro', error.message);
    return;
}

// Sucesso
const userId = data.user?.id;
```

---

### **Passo 2: Políticas RLS para `profiles`**

Como o **frontend cria o perfil com anon key**, precisa de políticas que permitam isso:

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Permitir INSERT apenas para criar SEU PRÓPRIO perfil (primeira vez)
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id 
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    );

-- 2. Qualquer autenticado pode VER perfis (necessário para ver anunciantes)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 3. Usuários podem ATUALIZAR apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 4. Apenas service_role pode deletar (admin)
-- (sem política = apenas service_role pode)
```

#### Por que essas políticas?

1. **INSERT**: Permite criar perfil quando `auth.uid() = id` e ainda não existe perfil
   - ✅ Evita duplicação (NOT EXISTS)
   - ✅ Evita criar perfil de outro usuário (auth.uid() = id)

2. **SELECT**: Todos autenticados veem todos os perfis
   - ✅ Necessário para ver dados do anunciante nos cards

3. **UPDATE**: Apenas seu próprio perfil
   - ✅ Segurança básica

---

### **Passo 3: Políticas RLS para `active_sessions`**

```sql
-- Habilitar RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Usuários podem VER apenas suas próprias sessões
CREATE POLICY "Users can view own sessions" ON active_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Permitir INSERT se for sua própria sessão
-- (as funções SECURITY DEFINER vão conseguir inserir)
CREATE POLICY "Users can create own sessions" ON active_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Permitir UPDATE apenas das próprias sessões
CREATE POLICY "Users can update own sessions" ON active_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Permitir DELETE apenas das próprias sessões
CREATE POLICY "Users can delete own sessions" ON active_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- As funções SECURITY DEFINER vão executar com privilégios elevados
-- e conseguirão fazer as operações mesmo com RLS ativo
```

---

## 🎯 Plano de Ação Completo

### 1️⃣ Atualizar `SignUpForm.js`
- Remover chamada para Edge Function inexistente
- Usar `supabase.auth.signUp()` diretamente
- Ajustar tratamento de erros

### 2️⃣ Criar e executar script SQL
- Habilitar RLS em ambas as tabelas
- Criar políticas corretas

### 3️⃣ Testar fluxo completo
- Cadastro novo usuário
- Login
- Atualização de perfil
- Visualização de outros perfis
- Sessões

---

## 📝 Scripts Prontos

### Script 1: `admin/enable_rls_profiles.sql`
```sql
-- =====================================================
-- HABILITAR RLS PARA PROFILES
-- =====================================================

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Permitir INSERT do próprio perfil (uma vez)
CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id 
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    );

-- 2. Todos autenticados podem ver todos os perfis
CREATE POLICY "Authenticated users can view all profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 3. Atualizar apenas próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Verificar
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```

### Script 2: `admin/enable_rls_active_sessions.sql`
```sql
-- =====================================================
-- HABILITAR RLS PARA ACTIVE_SESSIONS
-- =====================================================

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON active_sessions;

-- Habilitar RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- 1. Ver apenas próprias sessões
CREATE POLICY "Users can view own sessions" ON active_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Criar apenas próprias sessões
CREATE POLICY "Users can create own sessions" ON active_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Atualizar apenas próprias sessões
CREATE POLICY "Users can update own sessions" ON active_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Deletar apenas próprias sessões
CREATE POLICY "Users can delete own sessions" ON active_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Verificar
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'active_sessions';

SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'active_sessions';
```

---

## ⚠️ Atenção Especial

### Problema no `SignUpForm.js`:
A linha 76 chama `supabase.functions.invoke('signup-proxy')` mas essa função **NÃO EXISTE MAIS**!

Isso significa que **o cadastro está FALHANDO** atualmente.

Preciso corrigir isso urgentemente! 🚨

---

## 🚀 Próximos Passos

**ORDEM DE EXECUÇÃO:**

1. ✅ **PRIMEIRO**: Corrigir `SignUpForm.js` (cadastro está quebrado!)
2. ✅ **SEGUNDO**: Executar scripts SQL para habilitar RLS
3. ✅ **TERCEIRO**: Testar tudo

**Quer que eu faça as correções agora?** 🎯

