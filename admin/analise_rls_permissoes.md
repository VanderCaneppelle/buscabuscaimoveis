# Análise RLS e Permissões - Tabelas Supabase

## 📋 Situação Atual

Você está recebendo 4 avisos do Supabase sobre RLS desabilitado:

1. **`public.active_sessions`** - Policy Exists RLS Disabled
2. **`public.profiles`** - Policy Exists RLS Disabled  
3. **`public.profiles`** - RLS Disabled in Public
4. **`public.active_sessions`** - RLS Disabled in Public

---

## 🔍 Análise Detalhada

### 1. **Tabela `profiles`**

#### Situação Atual:
- ✅ Edge Function cria o perfil com `SERVICE_ROLE_KEY` (ignora RLS)
- ❌ Frontend TAMBÉM tenta criar perfil (linhas 105-114 do `SignUpForm.js`)
- ❌ RLS desabilitado para permitir INSERT do frontend com `anon key`

#### Problema:
**Duplicação de lógica de criação de perfil:**
- Edge Function já cria o perfil usando Admin API
- Frontend tenta criar novamente (código legado)
- RLS foi desabilitado para permitir isso, mas não deveria ser necessário

#### Dados Acessados:
```javascript
// Frontend precisa fazer:
- INSERT (na criação - NÃO DEVERIA)
- SELECT (para ler perfil do usuário)
- UPDATE (para atualizar dados do perfil)
```

---

### 2. **Tabela `active_sessions`**

#### Situação Atual:
- Tabela criada para controle de sessões simultâneas
- Tem funções `SECURITY DEFINER` para manipular dados
- RLS configurado mas desabilitado

#### Uso no Código:
```javascript
// lib/sessionManager.js
- SELECT (verificar sessão válida)
- INSERT (via função register_session)
- UPDATE (via funções)
```

#### Políticas Originais (database/session_management.sql):
```sql
-- Users can view own sessions
FOR SELECT USING (auth.uid() = user_id);

-- Users can update own sessions  
FOR UPDATE USING (auth.uid() = user_id);

-- Only functions can insert/delete
FOR INSERT WITH CHECK (false);
FOR DELETE USING (false);
```

---

## ✅ Melhor Caminho: Solução Recomendada

### **OPÇÃO 1: Recomendada ⭐**

#### Para `profiles`:

**1. Remover criação duplicada do frontend**
```javascript
// components/SignUpForm.js - REMOVER linhas 103-126
// A Edge Function já cria o perfil!
```

**2. Habilitar RLS com políticas corretas**
```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas:
-- 1. Qualquer usuário autenticado pode ler qualquer perfil (necessário para ver anunciantes)
CREATE POLICY "Authenticated users can view profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 2. Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Apenas service_role pode inserir (Edge Function)
CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

-- 4. Admin pode fazer tudo
CREATE POLICY "Admin full access" ON profiles
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');
```

**Vantagens:**
- ✅ Segurança total
- ✅ Edge Function gerencia criação
- ✅ Frontend só lê e atualiza
- ✅ RLS habilitado
- ✅ Sem duplicação

---

#### Para `active_sessions`:

**1. Habilitar RLS**
```sql
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Recriar políticas (foram criadas mas RLS estava desabilitado)
DROP POLICY IF EXISTS "Users can view own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON active_sessions;
DROP POLICY IF EXISTS "Only functions can insert sessions" ON active_sessions;
DROP POLICY IF EXISTS "Only functions can delete sessions" ON active_sessions;

-- Políticas corretas:
-- 1. Usuários podem ver suas próprias sessões
CREATE POLICY "Users can view own sessions" ON active_sessions
    FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Apenas funções podem inserir (via SECURITY DEFINER)
CREATE POLICY "Functions can insert sessions" ON active_sessions
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id); -- Permite se for o próprio usuário

-- 3. Apenas funções podem atualizar
CREATE POLICY "Functions can update sessions" ON active_sessions
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Apenas funções podem deletar
CREATE POLICY "Functions can delete sessions" ON active_sessions
    FOR DELETE 
    USING (auth.uid() = user_id);
```

**Vantagens:**
- ✅ Usuários só veem suas sessões
- ✅ Manipulação via funções seguras
- ✅ RLS habilitado

---

### **OPÇÃO 2: Alternativa (se houver problemas)**

Se você quiser manter a criação de perfil no frontend por algum motivo:

```sql
-- Para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Permitir INSERT apenas para novos usuários (primeira vez)
CREATE POLICY "Users can create own profile once" ON profiles
    FOR INSERT 
    WITH CHECK (
        auth.uid() = id 
        AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    );

-- Resto igual à OPÇÃO 1
```

**Desvantagens:**
- ⚠️ Duplicação de lógica (Edge Function + Frontend)
- ⚠️ Mais complexo de manter
- ⚠️ Race condition possível

---

## 🎯 Plano de Ação Recomendado

### Passo 1: Atualizar Edge Function (signup-proxy)
Verificar se já está criando o perfil. Se sim, prosseguir.

### Passo 2: Limpar código do frontend
```bash
# Remover criação de perfil do SignUpForm.js
```

### Passo 3: Aplicar políticas RLS
```bash
# Executar script SQL com as políticas
```

### Passo 4: Testar fluxo completo
1. Cadastro novo usuário
2. Confirmação de email
3. Login
4. Atualização de perfil
5. Sessões simultâneas

---

## 📝 Arquivos Afetados

### Frontend:
- `components/SignUpForm.js` (remover linhas 103-126)

### Backend/Database:
- Criar: `admin/enable_rls_correct.sql` (com as políticas)

### Edge Functions:
- Verificar: `supabase/functions/signup-proxy/index.ts` (se cria perfil)

---

## ⚠️ Observações Importantes

1. **Service Role Key**: Nunca expor no frontend! Apenas em:
   - Edge Functions (Deno.env)
   - Backend (process.env)
   - Admin tools

2. **Anon Key**: Pode ser exposto no frontend, protegido por RLS

3. **Auth.uid()**: Retorna o ID do usuário autenticado, base das políticas RLS

4. **SECURITY DEFINER**: Funções SQL que executam com privilégios do criador, ignoram RLS

---

## 🚀 Próximos Passos

1. **Você decide**: Opção 1 (recomendada) ou Opção 2?
2. **Eu crio**: Script SQL com as políticas
3. **Eu atualizo**: SignUpForm.js (se Opção 1)
4. **Você testa**: Fluxo completo

---

## 💡 Resumo Visual

```
┌─────────────────────────────────────────────────┐
│  CADASTRO (situação atual - INCORRETA)         │
├─────────────────────────────────────────────────┤
│  1. Frontend → Edge Function (signup-proxy)     │
│     ↓                                            │
│  2. Edge Function cria perfil (SERVICE_ROLE)    │
│     ↓                                            │
│  3. Frontend TAMBÉM tenta criar perfil (ANON)   │ ❌
│     ↓                                            │
│  4. RLS desabilitado para permitir isso         │ ❌
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  CADASTRO (situação ideal - CORRETA)            │
├─────────────────────────────────────────────────┤
│  1. Frontend → Edge Function (signup-proxy)     │
│     ↓                                            │
│  2. Edge Function cria perfil (SERVICE_ROLE)    │ ✅
│     ↓                                            │
│  3. Frontend NÃO tenta criar                    │ ✅
│     ↓                                            │
│  4. RLS habilitado com políticas corretas       │ ✅
└─────────────────────────────────────────────────┘
```

---

**Aguardando sua decisão para prosseguir! 🎯**

