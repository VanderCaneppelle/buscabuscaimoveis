# 🔍 Debug - Favoritos Realtime

## 🎯 Problema Relatado

**Situação:**

- ✅ Item some da HomeScreen
- ❌ Item NÃO some da FavoritesScreen
- ❌ Badge NÃO decrementa

---

## 📋 Checklist de Debug

### **1. Verificar se Realtime está conectado**

Veja nos logs ao fazer login:

```
[App] Usuário logado, carregando favoritos e plano...
🔴 [FavoritesStore] Conectando Realtime para userId: 2dbbbae8
📊 [FavoritesStore] Favoritos atuais no Set: 3
📡 [FavoritesStore] Status Realtime: SUBSCRIBED
```

**✅ Se ver "SUBSCRIBED"** → Realtime conectou\
**❌ Se não ver** → Realtime não conectou (problema no App.js)

---

### **2. Verificar se DELETE está sendo recebido**

Quando admin excluir imóvel, deve aparecer:

```
🗑️ [FavoritesStore] Favorito REMOVIDO via Realtime: abc123...
✅ [FavoritesStore] Favorito removido do Set. Total agora: 2
```

**✅ Se ver esses logs** → Realtime está recebendo e store atualizou\
**❌ Se não ver** → Trigger não está disparando ou Realtime não está recebendo

---

### **3. Verificar Badge**

Com os logs acima, o badge deve atualizar automaticamente.

**Se badge não atualiza:**

- Store atualizou mas TabNavigator não re-renderizou
- Problema: selector do Zustand

---

## 🔧 Possíveis Causas

### **Causa 1: Realtime não está conectado**

**Verificar:** `App.js` está chamando `connectRealtimeFavorites(user.id)`?

```javascript
// App.js - linha ~48
if (user?.id) {
    refreshFavorites();
    fetchUserPlanData(user.id);
    connectRealtimeFavorites(user.id); // ← Deve estar aqui
}
```

---

### **Causa 2: Trigger não está criado**

**Verificar:** Execute no Supabase:

```sql
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE '%favorites%';
```

**Deve retornar:**

- `trigger_cleanup_favorites_on_delete`
- `trigger_cleanup_favorites_on_update`

**Se não retornar:** Execute `database/enable_realtime_favorites.sql` novamente

---

### **Causa 3: Realtime não está habilitado**

**Verificar:** No Supabase Dashboard → Database → Replication

**Deve aparecer:**

- ✅ `favorites` na lista

**Se não aparecer:** Execute:

```sql
ALTER publication supabase_realtime ADD TABLE favorites;
```

---

### **Causa 4: RLS bloqueando evento**

O trigger faz DELETE direto, mas o Realtime respeita RLS.

**Verificar políticas RLS em favorites:**

```sql
SELECT * FROM pg_policies WHERE tablename = 'favorites';
```

**Deve ter política permitindo DELETE para o usuário**

---

## 🧪 Teste Diagnóstico

### **Passo a Passo:**

1. **Abra o app e faça login**
   - Veja os logs de conexão Realtime

2. **Favorita 1 imóvel**
   - Log esperado: `🔔 Favorito ADICIONADO via Realtime`
   - Badge deve incrementar

3. **No admin, exclua o imóvel**
   - Aguarde 3 segundos
   - Veja os logs

4. **Logs esperados:**

```
🗑️ [FavoritesStore] Favorito REMOVIDO via Realtime: abc123...
✅ [FavoritesStore] Favorito removido do Set. Total agora: 0
```

5. **Se VER os logs:**
   - ✅ Store atualizou
   - Problema está no UI (badge não observa corretamente)

6. **Se NÃO VER os logs:**
   - ❌ Realtime não recebeu o evento
   - Problema está no trigger ou RLS

---

## 🔧 Soluções

### **Solução 1: Store não está conectando**

No `App.js`, certifique-se de ter:

```javascript
const connectRealtimeFavorites = useFavoritesStore((state) =>
    state.connectRealtime
);

useEffect(() => {
    if (user?.id) {
        connectRealtimeFavorites(user.id);
    }
}, [user]);
```

---

### **Solução 2: Badge não observa corretamente**

No `MainNavigator.js`, deve ser:

```javascript
// ✅ CORRETO - Observa o Set diretamente
const favorites = useFavoritesStore((state) => state.favorites);
const favCount = favorites.size;

// ❌ ERRADO - Não é reativo
const favCount = useFavoritesStore((state) => state.getFavoriteCount());
```

---

### **Solução 3: Trigger não dispara Realtime**

O trigger precisa fazer DELETE normal (não SET NULL):

```sql
-- CORRETO
DELETE FROM favorites WHERE property_id = OLD.id;

-- Se estiver assim, não dispara Realtime
UPDATE favorites SET deleted = true WHERE property_id = OLD.id;
```

---

## 📊 Fluxo Esperado

```
1. Admin exclui imóvel
    ↓
2. Trigger: DELETE FROM favorites WHERE property_id = X
    ↓
3. Banco: Remove linhas da tabela
    ↓
4. Realtime: Detecta DELETE (por cada linha removida)
    ↓
5. Realtime: Envia evento para client
    ↓
6. FavoritesStore: Recebe evento DELETE
    ↓
7. FavoritesStore: Remove do Set
    ↓
8. Zustand: Notifica observers
    ↓
9. TabNavigator: Recalcula favCount (favorites.size)
    ↓
10. Badge: Atualiza visualmente
    ↓
✅ Badge decrementado!
```

---

## 🔍 O Que Verificar AGORA

**Abra o console e favorita/exclua um imóvel.**

**Cole aqui os logs que aparecem:**

- [ ] Logs de conexão Realtime
- [ ] Logs ao excluir imóvel
- [ ] Status do Set antes e depois

Isso vai me ajudar a identificar exatamente onde está o problema!

---

**Última Atualização:** 14/10/2025\
**Status:** 🔍 Diagnosticando
