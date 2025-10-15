# 🧪 Teste - Rejeição de Imóvel via Admin

## 🎯 Cenário do Problema

**Relatado:** Quando admin rejeita um imóvel aprovado, ele só some para o
usuário que cadastrou, mas permanece para os outros.

---

## 📋 Teste Completo

### **Preparação:**

1. **2 contas de usuário:**
   - Usuário A: Cadastrou um imóvel
   - Usuário B: Outro usuário qualquer

2. **Imóvel aprovado:**
   - Status: `approved`
   - Ad_status: `active`
   - Aparecendo na HomeScreen de ambos

---

### **Passo 1: Abrir HomeScreen em Ambas Contas**

**Usuário A:** Abre HomeScreen **Usuário B:** Abre HomeScreen (outro
dispositivo/browser)

**Verifique:** Ambos veem o mesmo imóvel na lista ✅

---

### **Passo 2: Admin Rejeita o Imóvel**

**Admin:** No painel, clica "Rejeitar" no imóvel

**Aguarde 2-3 segundos**

---

### **Passo 3: Verificar Logs**

**LOGS ESPERADOS (em AMBAS as contas):**

```
🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime: b375a057
📊 [PropertiesStore] Status: { ad_status: 'active', status: 'rejected' }
🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado: b375a057
🗑️ [PropertiesStore] Motivo: REJEITADO
📤 [PropertiesStore] Enviando REMOVE para HomeScreen
📡 [HomeScreen] Realtime update: REMOVE b375a057
🗑️ [HomeScreen] Removendo imóvel da lista: b375a057
📊 [HomeScreen] Lista antes: 15 → Lista depois: 14
```

---

## 🔍 Diagnóstico por Logs

### **Cenário A: Nenhum log aparece**

**Causa:** Realtime não está conectado ou não está detectando UPDATE

**Solução:** Verificar se `connectRealtimeProperties` foi chamado

---

### **Cenário B: Logs do PropertiesStore aparecem, mas não do HomeScreen**

**Logs:**

```
🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime
🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado
⚠️ [PropertiesStore] onUpdate callback não foi fornecido!
```

**Causa:** Callback não foi passado ao conectar Realtime

**Solução:** Verificar HomeScreen conectou com callback

---

### **Cenário C: Logs aparecem mas item não some**

**Logs:**

```
📡 [HomeScreen] Realtime update: REMOVE b375a057
🗑️ [HomeScreen] Removendo imóvel da lista: b375a057
📊 [HomeScreen] Lista antes: 15 → Lista depois: 15
```

**Causa:** Filter não está removendo (ID não corresponde)

**Solução:** Verificar formato do ID

---

### **Cenário D: Só aparece logs no Usuário A (que cadastrou)**

**Causa:** RLS (Row Level Security) pode estar bloqueando evento para outros
usuários

**Solução:** Verificar políticas RLS na tabela `properties`

---

## 🧪 Execute o Teste e Me Diga:

**Para USUÁRIO A (que cadastrou):**

- [ ] Logs aparecem?
- [ ] Item some da lista?
- [ ] Quais logs exatos?

**Para USUÁRIO B (outro usuário):**

- [ ] Logs aparecem?
- [ ] Item some da lista?
- [ ] Quais logs exatos?

---

**Cole aqui os logs de AMBOS os usuários!** 🔍

Isso vai mostrar exatamente onde está o problema.
