# 🏗️ Arquitetura Zustand + Realtime

## 🎯 Padrão Implementado

### **Fluxo Correto:**

```
Zustand Store (Estado Global)
    ↑
Realtime (Dispara eventos do banco)
    ↑
Components (Se inscrevem na store)
```

---

## ✅ Como Funciona

### **1. Zustand Gerencia Estado Global**

```javascript
// stores/favoritesStore.js
export const useFavoritesStore = create((set, get) => ({
    favorites: new Set(), // Estado global
    
    toggleFavorite: async (propertyId) => {
        // Atualiza estado otimisticamente
        set({ favorites: newFavorites });
        
        // Persiste no banco
        await supabase.rpc('toggle_favorite', ...);
    }
}));
```

### **2. Realtime Atualiza Zustand**

```javascript
// stores/favoritesStore.js
connectRealtime: ((userId) => {
    supabase
        .channel("favorites-sync")
        .on("postgres_changes", {
            event: "INSERT",
            filter: `user_id=eq.${userId}`,
        }, (payload) => {
            // ✨ Atualiza a store diretamente
            const newFavorites = new Set(favorites);
            newFavorites.add(payload.new.property_id);
            set({ favorites: newFavorites });
        })
        .subscribe();
});
```

### **3. Components Se Inscrevem na Store**

```javascript
// components/FavoriteButton.js
const FavoriteButton = React.memo(({ propertyId }) => {
    // ✨ Se inscreve na store - Zustand notifica quando mudar
    const isFavorited = useFavoritesStore((state) =>
        state.isFavorite(propertyId)
    );

    return (
        <Ionicons
            name={isFavorited ? "heart" : "heart-outline"}
        />
    );
});
```

---

## 🚫 O Que NÃO Fazer

### **❌ Passar Estado como Prop**

```javascript
// ERRADO - Cria dependência desnecessária
const renderProperty = ({ item }) => {
    const isFavorited = isFavorite(item.id); // ❌
    return <PropertyItem isFavorited={isFavorited} />; // ❌
};
```

### **❌ Adicionar Store nas Dependências**

```javascript
// ERRADO - Causa re-render de toda a lista
const favorites = useFavoritesStore(state => state.favorites); // ❌
useCallback(..., [favorites]); // ❌
```

### **❌ React.memo com Comparação que Bloqueia**

```javascript
// ERRADO - Impede Zustand de notificar
React.memo(Component, (prev, next) => {
    return prev.propertyId === next.propertyId; // ❌ Bloqueia re-render
});
```

---

## ✅ O Que Fazer

### **✅ Deixar Component Se Inscrever Diretamente**

```javascript
// CORRETO - Component se inscreve na store
const FavoriteButton = ({ propertyId }) => {
    const isFavorited = useFavoritesStore((state) =>
        state.isFavorite(propertyId)
    );
    // ✅ Zustand notifica apenas este component quando mudar
};
```

### **✅ React.memo Simples (ou sem comparação)**

```javascript
// CORRETO - React.memo sem comparação customizada
const FavoriteButton = React.memo(({ propertyId }) => {
    const isFavorited = useFavoritesStore((state) =>
        state.isFavorite(propertyId)
    );
    // ✅ Zustand pode notificar mudanças
});
```

### **✅ Realtime Atualiza Store Diretamente**

```javascript
// CORRETO - Realtime -> Store -> Components
.on('INSERT', (payload) => {
    set({ favorites: newFavorites }); // ✨ Zustand notifica subscribers
});
```

---

## 📊 Fluxo Completo

### **Ação Local (Usuário Clica):**

```
1. FavoriteButton detecta clique
    ↓
2. Chama toggleFavorite() da store
    ↓
3. Store atualiza (otimista)
    ↓
4. Zustand notifica FavoriteButton
    ↓
5. FavoriteButton re-renderiza (coração muda)
    ↓
6. Store persiste no banco
    ↓
✅ UI atualizada INSTANTANEAMENTE
```

### **Ação Remota (Outro Dispositivo):**

```
1. Outro dispositivo favorita
    ↓
2. Banco atualiza (INSERT)
    ↓
3. Realtime detecta INSERT
    ↓
4. Realtime notifica store
    ↓
5. Store atualiza favorites Set
    ↓
6. Zustand notifica FavoriteButton
    ↓
7. FavoriteButton re-renderiza (coração muda)
    ↓
✅ UI atualizada INSTANTANEAMENTE (1-2s)
```

### **Auto-Remoção (Admin Remove):**

```
1. Admin exclui/inativa imóvel
    ↓
2. Trigger deleta favoritos
    ↓
3. Realtime detecta DELETE
    ↓
4. Realtime notifica store
    ↓
5. Store remove do Set
    ↓
6. Zustand notifica FavoriteButton
    ↓
7. FavoriteButton re-renderiza (coração fica branco)
    ↓
✅ UI atualizada AUTOMATICAMENTE (1-2s)
```

---

## 🎯 Otimizações Mantidas

### **✅ Apenas Component Afetado Re-renderiza**

- FavoriteButton do imóvel X muda
- FavoriteButton do imóvel Y **NÃO re-renderiza**
- Lista **NÃO re-renderiza**
- Badge **NÃO re-renderiza** (usa seletor próprio)

### **✅ React.memo Funciona**

- PropertyItem memoizado por `item.id`
- Só re-renderiza se item mudar
- FavoriteButton dentro se inscreve independentemente

### **✅ Performance Máxima**

- Zustand: O(1) para verificar favorito
- Realtime: Apenas eventos relevantes
- Re-renders: Mínimos e localizados

---

## 📋 Componentes Corrigidos

| Componente         | Mudança                         | Motivo                      |
| ------------------ | ------------------------------- | --------------------------- |
| **FavoriteButton** | Removida comparação React.memo  | Permitir Zustand notificar  |
| **PropertyItem**   | Não recebe `isFavorited` prop   | FavoriteButton gerencia     |
| **HomeScreen**     | Não passa `isFavorited`         | Simplificação               |
| **HomeScreen**     | Removido `handleToggleFavorite` | FavoriteButton chama direto |

---

## 🧪 Validar Performance

### **Teste de Performance:**

1. Abra HomeScreen com 50 imóveis
2. Favorita 1 imóvel
3. **Esperado:**
   - ✅ Apenas 1 FavoriteButton re-renderiza
   - ✅ Lista NÃO re-renderiza
   - ✅ Outros cards NÃO re-renderizam

### **Como Verificar:**

```javascript
// Adicione log no PropertyItem
console.log("PropertyItem renderizado:", item.id);
```

Se ver muitos logs → Problema\
Se ver apenas 1-2 logs → ✅ Correto

---

## 🎓 Princípios Aplicados

### **1. Single Source of Truth**

- Store = única fonte de verdade
- Components leem da store
- Não duplicam estado

### **2. Subscriber Pattern**

- Components se inscrevem na store
- Store notifica quando mudar
- Apenas subscribers afetados re-renderizam

### **3. Optimistic Updates**

- UI atualiza imediatamente
- Backend sincroniza depois
- Rollback se falhar

### **4. Realtime Integration**

- Realtime atualiza store
- Store notifica components
- Separação de responsabilidades

---

## ✅ Checklist de Qualidade

- [x] Store é single source of truth
- [x] Components se inscrevem via Zustand
- [x] Realtime atualiza store
- [x] Apenas components afetados re-renderizam
- [x] Performance otimizada
- [x] Sem duplicação de estado
- [x] Sem prop drilling
- [x] Código limpo e manutenível

---

## 🎉 Resultado Final

**Arquitetura Clean:**

```
Realtime → Zustand Store → React Components
```

**Performance:**

- ⚡ Re-renders mínimos
- 🎯 Apenas components afetados atualizam
- 💾 Estado centralizado
- 🔄 Sincronização automática

---

**Última Atualização:** 14/10/2025\
**Versão:** 2.0.0 (Arquitetura Otimizada)\
**Status:** ✅ Clean & Performante
