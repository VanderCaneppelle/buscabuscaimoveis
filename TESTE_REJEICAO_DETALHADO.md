# 🧪 Teste Detalhado - Rejeição de Imóvel

## 📋 Execute Este Teste com RLS Desabilitado

### **Preparação:**

1. ✅ RLS está desabilitado (você já fez)
2. ✅ Reinicie o app completamente
3. ✅ Abra console para ver logs

---

## 🔍 TESTE 1: Verificar Conexão Realtime

### **Ao Abrir HomeScreen:**

**Logs esperados:**

```
  HomeScreen: COMPONENTE MONTADO
🔴 [PropertiesStore] Conectando Realtime...
📡 [PropertiesStore] Status Realtime: SUBSCRIBED
```

**Verifique:**

- [ ] Viu "COMPONENTE MONTADO"?
- [ ] Viu "Conectando Realtime"?
- [ ] Viu "SUBSCRIBED"?

**Se NÃO viu "SUBSCRIBED":**

- Realtime não conectou
- HomeScreen pode não estar chamando `connectRealtimeProperties`

---

## 🧪 TESTE 2: Admin Rejeita Imóvel

### **Ação:** Admin rejeita 1 imóvel que está na lista

### **Aguarde 3 segundos e veja os logs:**

**LOGS ESPERADOS:**

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

**E no PropertiesStore:**

```
🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime: b375a057
📊 [PropertiesStore] Status: { ad_status: 'inactive', status: 'rejected' }
🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado: b375a057
🗑️ [PropertiesStore] Motivo: REJEITADO
📤 [PropertiesStore] Enviando REMOVE para HomeScreen
```

---

## 🔍 Diagnóstico por Logs

### **CENÁRIO A: Nenhum log do PropertiesStore**

**Causa:** Realtime não detectou UPDATE

**Verificar:**

```sql
-- Ver se imóvel realmente mudou no banco
SELECT id, status, ad_status, updated_at 
FROM properties 
WHERE id = 'COLE_O_ID_DO_IMOVEL';
```

---

### **CENÁRIO B: Logs do PropertiesStore aparecem, mas NÃO do HomeScreen**

**Logs:**

```
🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime
🗑️ [PropertiesStore] Removendo imóvel inativo/rejeitado
📤 [PropertiesStore] Enviando REMOVE para HomeScreen
❌ [HomeScreen] NÃO apareceu nada
```

**Causa:** Callback não está sendo chamado

**Solução:** Verificar se `connectRealtimeProperties(handleRealtimeUpdate)` está
correto

---

### **CENÁRIO C: Todos logs aparecem, mas item não some**

**Logs:**

```
📡 [HomeScreen] Type: REMOVE
🗑️ [HomeScreen] Removendo imóvel da lista
📊 [HomeScreen] Lista antes: 15 → Lista depois: 15
```

**Causa:** Filter não encontrou o item (ID diferente ou formato diferente)

**Solução:** Verificar IDs

---

### **CENÁRIO D: Só funciona para Usuário A (dono)**

**Causa:** RLS bloqueando (já sabemos que é isso)

**Solução:** Aplicar políticas RLS corretas

---

## 🧪 Cole Aqui os Logs Completos

**Quando admin rejeitar o imóvel, cole TODOS os logs que aparecerem:**

**PropertiesStore:**

- [ ] `🔄 [PropertiesStore] Imóvel ATUALIZADO via Realtime`
- [ ] `📊 [PropertiesStore] Status:`
- [ ] `🗑️ [PropertiesStore] Removendo...`
- [ ] `📤 [PropertiesStore] Enviando REMOVE`

**HomeScreen:**

- [ ] `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
- [ ] `📡 [HomeScreen] Realtime update recebido!`
- [ ] `📡 [HomeScreen] Type:`
- [ ] `🗑️ [HomeScreen] Removendo imóvel da lista`
- [ ] `📊 [HomeScreen] Lista antes: X → Lista depois: Y`

---

## 📊 Status Stories (373s)

**373 segundos = 6.2 minutos**

Isso é **MENOR que 10 minutos**, então está **CORRETO** usar cache! ✅

**Log melhorado agora mostra:**

```
⏰ Cache age: 373 segundos (6 min)
✅ Cache ainda válido (<10 min)
```

**Expira em:** 10 - 6 = 4 minutos restantes

---

**Cole os logs do teste de rejeição!** 🔍
