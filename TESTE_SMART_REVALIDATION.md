# 🧪 Teste - Smart Revalidation + Realtime

## 🎯 2 Correções Feitas

### **1. Smart Revalidation ao Voltar para HomeScreen** ✨

- Antes: Pulava verificação se já tinha dados
- Agora: Sempre verifica cache e faz smart revalidation

### **2. Logs Detalhados de Realtime**

- Logs com bordas para destacar eventos
- Mostra type, ID e status

---

## 📋 TESTE 1: Smart Revalidation

### **Preparação:**

1. Reinicie o app completamente
2. Abra o console

---

### **Passo 1: Primeira Visita à HomeScreen**

**Veja logs:**

```
🚀🚀🚀 PropertyCacheService: INICIANDO BUSCA DE PROPRIEDADES
📦 PropertyCacheService: Nenhum timestamp de cache encontrado
🌐🌐🌐 PropertyCacheService: BUSCANDO DO SERVIDOR
💾 PropertyCacheService: Dados salvos no cache
💾 PropertyCacheService: Timestamp do servidor salvo: 2025-10-15T10:30:45
```

**Anote o timestamp do servidor!**

---

### **Passo 2: Sair e Voltar (<5 min)**

1. Navegue para outra tela (Favoritos, Perfil, etc.)
2. Aguarde 30 segundos
3. Volte para HomeScreen

**Logs esperados:**

```
  HomeScreen: TELA GANHOU FOCO
  HomeScreen: Já tem dados, fazendo smart revalidation...
🔍 HomeScreen: Dados já carregados, mas vou verificar cache (smart revalidation)
📦 PropertyCacheService: Cache encontrado, fazendo checagem inteligente...
📦 PropertyCacheService: Cache age: 45s
✅ PropertyCacheService: Cache ainda válido
📦📦📦 PropertyCacheService: USANDO CACHE (Smart Revalidation)
```

**Resultado:** Cache válido, usado instantaneamente ✅

---

### **Passo 3: Aguardar Cache Expirar (6+ min)**

1. Saia da HomeScreen
2. **Aguarde 6-7 minutos**
3. Volte para HomeScreen

**Logs esperados:**

```
  HomeScreen: TELA GANHOU FOCO
  HomeScreen: Já tem dados, fazendo smart revalidation...
🔍 HomeScreen: Dados já carregados, mas vou verificar cache (smart revalidation)
📦 PropertyCacheService: Cache encontrado, fazendo checagem inteligente...
📦 PropertyCacheService: Cache age: 380s
⏰ PropertyCacheService: Cache expirou, fazendo checagem inteligente...
🔍 PropertyCacheService: Checando mudanças no servidor...
📡 PropertyCacheService: Última atualização do servidor: 2025-10-15T10:30:45
✅ PropertyCacheService: Sem mudanças no servidor, renovando cache
🔄 PropertyCacheService: Cache renovado por mais 5 minutos
📦📦📦 PropertyCacheService: USANDO CACHE (Smart Revalidation)
```

**Resultado:** Cache renovado sem refazer query! ✅

---

### **Passo 4: Admin Aprova Imóvel (Teste Mudança)**

1. Saia da HomeScreen
2. Admin aprova 1 imóvel
3. Aguarde 6+ minutos (cache expira)
4. Volte para HomeScreen

**Logs esperados:**

```
⏰ PropertyCacheService: Cache expirou, fazendo checagem inteligente...
🔍 PropertyCacheService: Checando mudanças no servidor...
📡 PropertyCacheService: Última atualização do servidor: 2025-10-15T10:42:15
🔄 PropertyCacheService: Detectou mudanças no servidor, precisa atualizar
🌐🌐🌐 PropertyCacheService: BUSCANDO DO SERVIDOR
```

**Resultado:** Detectou mudança e atualizou! ✅

---

## 📋 TESTE 2: Realtime - Rejeição de Imóvel

### **Preparação:**

1. RLS ainda desabilitado
2. HomeScreen aberto em 2 usuários

---

### **Ação: Admin Rejeita Imóvel**

**Logs esperados em AMBOS os usuários:**

**PropertiesStore:**

```
🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime: b375a057
📊 [PropertiesStore] Status: { ad_status: 'inactive', status: 'rejected' }
🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado: b375a057
🗑️ [PropertiesStore] Motivo: REJEITADO
📤 [PropertiesStore] Enviando REMOVE para HomeScreen
```

**HomeScreen:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 [HomeScreen] Realtime update recebido!
📡 [HomeScreen] Type: REMOVE
📡 [HomeScreen] ID: b375a057
📡 [HomeScreen] Status: rejected, Ad_status: inactive
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️ [HomeScreen] Removendo imóvel da lista: b375a057
📊 [HomeScreen] Lista antes: 15 → Lista depois: 14
```

**Verifique:**

- [ ] Item some VISUALMENTE em ambos?
- [ ] Logs aparecem em ambos?

---

## 🔍 Se Logs NÃO Aparecem

### **Caso A: Nenhum log do PropertiesStore**

**Causa:** Realtime não detectou UPDATE

**Debug:**

```sql
-- Verificar se imóvel mudou no banco
SELECT id, status, ad_status, updated_at 
FROM properties 
WHERE id = 'COLE_ID_DO_IMOVEL'
ORDER BY updated_at DESC;
```

---

### **Caso B: Logs do PropertiesStore SIM, HomeScreen NÃO**

**Causa:** `onUpdate` callback não está sendo chamado

**Debug:**

- Verificar se HomeScreen conectou Realtime corretamente
- Ver se `handleRealtimeUpdate` foi passado

---

### **Caso C: Todos logs aparecem, mas item não some**

**Causa:** `setProperties` não está removendo

**Debug:**

- Verificar se IDs são iguais
- Verificar se filter está funcionando

---

## ✅ Checklist Final

Após os testes:

- [ ] Smart revalidation funciona ao voltar (<5 min)?
- [ ] Smart revalidation renova cache (6+ min, sem mudanças)?
- [ ] Smart revalidation detecta mudanças (6+ min, com mudanças)?
- [ ] Realtime remove imóvel rejeitado para AMBOS usuários?
- [ ] Logs aparecem claros e completos?

---

**Execute os testes e cole aqui os logs completos!** 🔍
