# 🔒 RLS Properties - Explicação Completa

## 🎯 Por Que RLS Estava Bloqueando Realtime?

### **O Problema:**

```
Suas políticas atuais:
  - Admins podem ver TUDO ✅
  - (Provavelmente) Dono vê seus próprios ✅
  - ❌ Usuários comuns NÃO têm política para ver imóveis de outros

Resultado:
  - Usuário B não tem SELECT em imóvel do Usuário A
  - Realtime RESPEITA RLS
  - Realtime NÃO envia eventos para Usuário B ❌
```

---

## ✅ A Solução

**Adicionar esta política:**

```sql
CREATE POLICY "Todos podem ver imóveis aprovados e ativos"
ON properties
FOR SELECT
USING (status = 'approved' AND ad_status = 'active');
```

**Por quê é seguro?**

- ✅ Marketplace = imóveis públicos
- ✅ Só mostra **aprovados e ativos**
- ✅ Não mostra pendentes/rejeitados
- ✅ Realtime funciona para todos

---

## 📋 Políticas Recomendadas (8 Total)

### **👁️ SELECT (3 políticas):**

```sql
-- 1. Todos veem aprovados e ativos (MARKETPLACE)
USING (status = 'approved' AND ad_status = 'active')

-- 2. Dono vê TODOS os seus
USING (auth.uid() = user_id)

-- 3. Admin vê TUDO
USING (is_admin = true)
```

**Resultado:**

- User comum vê: Imóveis aprovados de TODOS ✅
- User dono vê: TODOS os seus (aprovados, pendentes, rejeitados) ✅
- Admin vê: TUDO ✅

---

### **➕ INSERT (1 política):**

```sql
-- Todos podem criar com seu user_id
WITH CHECK (auth.uid() = user_id)
```

---

### **✏️ UPDATE (2 políticas):**

```sql
-- 1. Admin pode atualizar TUDO
USING (is_admin = true)

-- 2. Dono pode atualizar seus próprios
USING (auth.uid() = user_id)
```

---

### **🗑️ DELETE (2 políticas):**

```sql
-- 1. Admin pode deletar TUDO
USING (is_admin = true)

-- 2. Dono pode deletar seus próprios
USING (auth.uid() = user_id)
```

---

## 🔄 Como Realtime Funciona Com RLS

### **Regra do Supabase:**

```
Usuário recebe evento Realtime
  ↓
Supabase verifica: Usuário tem SELECT neste registro?
  ├─ SIM: Envia evento ✅
  └─ NÃO: Bloqueia evento ❌
```

### **Exemplo Prático:**

**Imóvel:** `id: abc123, status: 'approved', ad_status: 'active'`

**Usuário A (dono):**

- Política: `user_id = auth.uid()` ✅
- Política: `status = 'approved' AND ad_status = 'active'` ✅
- **Recebe eventos:** ✅

**Usuário B (comum):**

- Política: `status = 'approved' AND ad_status = 'active'` ✅
- **Recebe eventos:** ✅

**Admin rejeita (status → 'rejected'):**

**Usuário A:**

- Ainda tem SELECT via `user_id = auth.uid()` ✅
- Recebe UPDATE ✅
- Remove da lista ✅

**Usuário B:**

- Tinha SELECT via `status = 'approved'`
- Agora `status = 'rejected'`
- ✨ Supabase envia UPDATE antes de verificar nova condição
- Recebe UPDATE ✅
- Remove da lista ✅

---

## 🔧 Execute Este SQL

```sql
-- Copiar TUDO de: database/rls_properties_COMPLETO.sql
```

**Ele faz:**

1. Remove todas as políticas antigas
2. Cria as 8 políticas corretas
3. Mostra tabela de verificação

**Resultado esperado:**

```
✅ 8 políticas criadas
✅ 3 SELECT (público, dono, admin)
✅ 1 INSERT
✅ 2 UPDATE (admin, dono)
✅ 2 DELETE (admin, dono)
```

---

## 🧪 Teste Após Executar

1. **Reabilite RLS:**
   ```sql
   ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
   ```

2. **Abra HomeScreen em 2 usuários**

3. **Admin rejeita imóvel**

4. **Veja logs em AMBOS:**
   ```
   🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime
   🗑️ [PropertiesStore] Motivo: REJEITADO
   🗑️ [HomeScreen] Removendo imóvel da lista
   ```

5. ✅ **Passou:** Item some para AMBOS!

---

## 📊 Comparativo

### **Antes (Muito Restritivo):**

```
SELECT:
  - Admin: TUDO ✅
  - Dono: Seus próprios ✅
  - Comum: ❌ NADA (bloqueado)

Realtime:
  - Admin: Recebe todos eventos ✅
  - Dono: Recebe seus eventos ✅
  - Comum: ❌ NÃO recebe (sem SELECT)
```

### **Agora (Correto):**

```
SELECT:
  - Admin: TUDO ✅
  - Dono: Seus próprios ✅
  - Comum: Aprovados e ativos ✅

Realtime:
  - Admin: Recebe todos eventos ✅
  - Dono: Recebe seus eventos ✅
  - Comum: Recebe eventos de aprovados ✅
```

---

## 🔐 Segurança Mantida

**O que continua protegido:**

- ✅ Imóveis **pendentes** → Só dono e admin veem
- ✅ Imóveis **rejeitados** → Só dono e admin veem
- ✅ Imóveis **inativos** → Só dono e admin veem
- ✅ Users só podem **criar com seu user_id**
- ✅ Users só podem **editar seus próprios**
- ✅ Users só podem **deletar seus próprios**

**O que mudou:**

- ✅ Imóveis **aprovados e ativos** → TODOS veem (correto para marketplace!)

---

**Execute o SQL e teste! Deve funcionar perfeitamente agora!** 🚀
