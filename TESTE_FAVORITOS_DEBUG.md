# 🧪 Teste de Debug - Favoritos

## 📋 Siga Este Roteiro

### **Preparação:**

1. ✅ Execute o SQL: `database/enable_realtime_favorites.sql`
2. ✅ Faça logout e login novamente
3. ✅ Abra o console para ver os logs

---

## 🔍 TESTE 1: Verificar Conexão

### **Ao Fazer Login:**

**Logs esperados:**

```
[App] Usuário logado, carregando favoritos e plano...
🔴 [FavoritesStore] Conectando Realtime para userId: 2dbbbae8
📊 [FavoritesStore] Favoritos atuais no Set: 0
📡 [FavoritesStore] Status Realtime: SUBSCRIBED
```

**✅ Se ver "SUBSCRIBED"** → Tudo ok, continuar\
**❌ Se NÃO ver** → Problema no App.js ou SQL não foi executado

---

## 🔍 TESTE 2: Favoritar Imóvel

### **Ação:** Clique no coração de 1 imóvel

**Logs esperados:**

```
[FavoritesStore] toggleFavorite:start { propertyId: 'abc...', wasFavorited: false }
📊 [TabNavigator] Badge de favoritos atualizado: 1
🔔 [FavoritesStore] Favorito ADICIONADO via Realtime: abc123...
```

**Verifique:**

- [ok] Badge mostra "1"
- [ok] Coração ficou vermelho

---

## 🔍 TESTE 3: Excluir Imóvel (Admin)

### **Ação:** No painel admin, EXCLUA o imóvel favoritado

### **Aguarde 3 segundos e veja os logs:**

**Logs esperados:**

```
🗑️ [FavoritesStore] Favorito REMOVIDO via Realtime: abc123...
✅ [FavoritesStore] Favorito removido do Set. Total agora: 0
📊 [TabNavigator] Badge de favoritos atualizado: 0
🗑️ [FavoritesScreen] Favorito REMOVIDO via Realtime: abc123...
```

**Verifique:**

- [ok] Log "Favorito REMOVIDO via Realtime" apareceu?
- [n_ok] Log "Total agora: 0" apareceu?
- [n_ok] Log "Badge atualizado: 0" apareceu?
- [n_ok] Badge sumiu da tab?
- [ok] Item sumiu da FavoritesScreen?

---

## 🔍 TESTE 4: Inativar Imóvel (Admin)

### **Preparação:**

1. Favorita outro imóvel (badge = 1)
2. No admin, INATIVE o imóvel (ad_status = 'inactive')

### **Aguarde 3 segundos e veja os logs:**

**Logs esperados:**

```
🗑️ [FavoritesStore] Favorito REMOVIDO via Realtime: xyz789...
✅ [FavoritesStore] Favorito removido do Set. Total agora: 0
📊 [TabNavigator] Badge de favoritos atualizado: 0
```

**Verifique:**

- [ok] Logs de remoção apareceram?
- [n_ok] Badge decrementou?
- [n_ok] Item sumiu da FavoritesScreen?

---

## 📊 Resultados Possíveis

### **Cenário A: Todos os logs aparecem, mas badge não atualiza**

**Causa:** Badge não está observando o Set corretamente

**Solução:** Já corrigimos no MainNavigator, mas pode precisar de restart do app

---

### **Cenário B: Log "REMOVIDO via Realtime" NÃO aparece**

**Causa:** Trigger não está disparando ou Realtime não está recebendo

**Solução:**

```sql
-- Verificar se trigger existe
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%favorites%';

-- Se não existir, executar novamente:
-- database/enable_realtime_favorites.sql
```

---

### **Cenário C: Log aparece, mas "Total agora" não muda**

**Causa:** Set não está sendo atualizado corretamente

**Solução:** Já corrigimos (removemos verificação inFlight)

---

## 🔧 EXECUTE AGORA

**Faça os 4 testes e me diga:**

1. Quais logs apareceram?
2. O que funcionou?
3. O que NÃO funcionou?

Com essas informações vou identificar exatamente o problema! 🔍

---

**Cole aqui os logs completos do console após os testes.**
