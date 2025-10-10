# 📚 ZUSTAND - GUIA COMPLETO

> Documentação detalhada sobre como o Zustand funciona no projeto BuscaBusca Imóveis

---

## 🎯 O QUE É ZUSTAND?

Zustand é uma biblioteca de **gerenciamento de estado global** para React. Pense nele como uma "memória compartilhada" que todas as telas do app podem acessar.

### **Analogia:**
- **Sem Zustand**: Cada tela tem sua própria gaveta (useState) - não compartilham informações
- **Com Zustand**: Todas as telas acessam a mesma gaveta central - sempre sincronizadas

---

## 🏗️ ARQUITETURA DO ZUSTAND

```
┌─────────────────────────────────────────────────────────┐
│                    ZUSTAND STORE                        │
│              (Memória Global do App)                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  ESTADO (State)                                  │  │
│  │  - boostedPropertyIds: Set([id1, id2, ...])    │  │
│  │  - boostedProperties: [{...}, {...}]           │  │
│  │  - lastFetch: 1234567890                       │  │
│  │  - loading: false                               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │  AÇÕES (Actions)                                │  │
│  │  - fetchBoostedIds()                           │  │
│  │  - fetchBoostedProperties()                    │  │
│  │  - addBoost()                                  │  │
│  │  - isBoosted()                                 │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           ▲                    ▲                    ▲
           │                    │                    │
    ┌──────┴──────┐      ┌─────┴──────┐      ┌─────┴──────┐
    │ HomeScreen  │      │ Discover   │      │ BoostPay   │
    │             │      │ Screen     │      │ Screen     │
    └─────────────┘      └────────────┘      └────────────┘
```

---

## 🔄 FLUXO COMPLETO - PASSO A PASSO

### **1️⃣ CRIAÇÃO DO STORE**

```javascript
// stores/boostsStore.js
export const useBoostsStore = create((set, get) => ({
    // ESTADO INICIAL
    boostedPropertyIds: new Set(),
    lastFetch: null,
    
    // AÇÕES
    fetchBoostedIds: async () => {
        // Lógica aqui...
    }
}));
```

**O que acontece:**
- ✅ Zustand cria uma "caixa" na memória do JavaScript
- ✅ Essa caixa fica disponível para TODO o app
- ✅ Não está no React, está no JavaScript puro (por isso é rápido)

---

### **2️⃣ COMPONENTE USA O STORE**

```javascript
// HomeScreen.js
const boostedPropertyIds = useBoostsStore(state => state.boostedPropertyIds);
const fetchBoostedIds = useBoostsStore(state => state.fetchBoostedIds);
```

**O que acontece:**
1. ✅ HomeScreen "se inscreve" no store
2. ✅ Zustand monitora: "HomeScreen quer saber sobre `boostedPropertyIds`"
3. ✅ Se `boostedPropertyIds` mudar → HomeScreen re-renderiza
4. ✅ Se outros valores mudarem → HomeScreen NÃO re-renderiza (otimização!)

---

### **3️⃣ PRIMEIRA CHAMADA (CACHE MISS)**

```javascript
// HomeScreen.js - useFocusEffect
useEffect(() => {
    fetchBoostedIds(); // 1ª vez
}, []);
```

**Fluxo detalhado:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. HomeScreen chama fetchBoostedIds()                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Store verifica cache                                 │
│    - lastFetch = null                                   │
│    - Cache MISS! Precisa buscar do servidor            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Store consulta Supabase                              │
│    supabase.from('property_boosts').select(...)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Supabase retorna dados                               │
│    [{ property_id: 'abc' }, { property_id: 'def' }]    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Store atualiza estado (set)                         │
│    boostedPropertyIds = Set(['abc', 'def'])            │
│    lastFetch = 1704067200000 (timestamp atual)         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Zustand notifica componentes inscritos               │
│    - HomeScreen: "boostedPropertyIds mudou!"           │
│    - HomeScreen re-renderiza                           │
└─────────────────────────────────────────────────────────┘
```

**Console logs:**
```
[BoostsStore] 🔄 Buscando IDs boosted do servidor...
[BoostsStore] ✅ 2 IDs boosted carregados
```

---

### **4️⃣ SEGUNDA CHAMADA (CACHE HIT)**

```javascript
// DiscoverScreen.js - 2 minutos depois
useEffect(() => {
    fetchBoostedIds(); // Usa cache!
}, []);
```

**Fluxo detalhado:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. DiscoverScreen chama fetchBoostedIds()               │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Store verifica cache                                 │
│    - lastFetch = 1704067200000                         │
│    - now = 1704067320000 (2 min depois)                │
│    - Diferença = 120 segundos < 300 segundos (5 min)   │
│    - Cache HIT! ✅                                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Store retorna dados do cache (SEM CHAMADA!)         │
│    return boostedPropertyIds (já em memória)           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. DiscoverScreen recebe dados INSTANTANEAMENTE         │
│    - Nenhuma chamada ao servidor                       │
│    - Nenhum loading                                    │
│    - Dados já estão na memória                         │
└─────────────────────────────────────────────────────────┘
```

**Console logs:**
```
[BoostsStore] 📦 Usando cache de IDs boosted
```

**Economia:**
- ⚡ **0ms de rede** (vs ~200-500ms do Supabase)
- 💰 **0 requisições** ao servidor
- 🔋 **0 bateria** gasta

---

### **5️⃣ ATUALIZAÇÃO DE ESTADO**

```javascript
// BoostPaymentScreen.js - Após pagamento
addBoost(propertyId);
```

**Fluxo detalhado:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. BoostPaymentScreen chama addBoost('xyz')            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Store executa ação addBoost                         │
│    const newIds = new Set(boostedPropertyIds)          │
│    newIds.add('xyz')                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Store atualiza estado (set)                         │
│    boostedPropertyIds = Set(['abc', 'def', 'xyz'])     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Zustand notifica TODOS os componentes inscritos      │
│    - HomeScreen: re-renderiza                          │
│    - DiscoverScreen: re-renderiza                      │
│    - BoostPaymentScreen: re-renderiza                  │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Badge "🚀 DESTAQUE" aparece em TODAS as telas       │
│    - Sincronização automática                          │
│    - Sem refresh manual                                │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 ONDE OS DADOS SÃO ARMAZENADOS?

### **Hierarquia de Armazenamento:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. MEMÓRIA RAM (Zustand Store)                         │
│    - Duração: Enquanto o app estiver aberto            │
│    - Velocidade: INSTANTÂNEO (~0ms)                    │
│    - Persistência: NÃO (fecha app = perde dados)      │
│    - Localização: JavaScript Heap Memory               │
│                                                         │
│    boostedPropertyIds: Set(['abc', 'def'])             │
│    lastFetch: 1704067200000                            │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (se necessário)
                         ▼
┌─────────────────────────────────────────────────────────┐
│ 2. SERVIDOR (Supabase)                                 │
│    - Duração: Permanente                               │
│    - Velocidade: LENTO (~200-500ms)                    │
│    - Persistência: SIM                                 │
│    - Localização: PostgreSQL Database                  │
│                                                         │
│    property_boosts table                               │
└─────────────────────────────────────────────────────────┘
```

### **Comparação:**

| Aspecto | **Zustand (RAM)** | **Supabase (Servidor)** |
|---------|-------------------|-------------------------|
| **Velocidade** | ⚡ 0ms | 🐢 200-500ms |
| **Persistência** | ❌ Temporário | ✅ Permanente |
| **Sincronização** | ✅ Automática | ❌ Manual |
| **Offline** | ✅ Funciona | ❌ Precisa internet |
| **Custo** | 💰 Grátis | 💰 Paga por request |

---

## 🔍 COMO O ZUSTAND DETECTA MUDANÇAS?

### **Seletores Inteligentes:**

```javascript
// ❌ MAU: Re-renderiza SEMPRE que qualquer coisa mudar
const store = useBoostsStore();

// ✅ BOM: Re-renderiza APENAS quando boostedPropertyIds mudar
const boostedPropertyIds = useBoostsStore(state => state.boostedPropertyIds);
```

### **Exemplo prático:**

```javascript
// Store atual
{
    boostedPropertyIds: Set(['abc']),
    loading: false,
    lastFetch: 123456
}

// Componente A
const ids = useBoostsStore(state => state.boostedPropertyIds);
// Monitora: boostedPropertyIds

// Componente B
const loading = useBoostsStore(state => state.loading);
// Monitora: loading
```

**Cenário 1: `loading` muda para `true`**
- ✅ Componente B re-renderiza
- ❌ Componente A NÃO re-renderiza (otimização!)

**Cenário 2: `boostedPropertyIds` adiciona 'def'**
- ✅ Componente A re-renderiza
- ❌ Componente B NÃO re-renderiza

---

## ⏱️ QUANDO AS CHAMADAS ACONTECEM?

### **Timeline Completa:**

```
T=0s    HomeScreen monta
        └─> fetchBoostedIds() 
            └─> Cache MISS → Busca do servidor
            └─> Salva: lastFetch = T=0s

T=30s   Usuário navega para DiscoverScreen
        └─> fetchBoostedIds()
            └─> Cache HIT (30s < 5min)
            └─> Retorna dados da RAM

T=120s  Usuário volta para HomeScreen
        └─> NÃO chama fetchBoostedIds (já tem os dados)
        └─> Dados já estão no store

T=180s  Usuário paga boost
        └─> addBoost('xyz')
            └─> Atualização INSTANTÂNEA
            └─> TODAS as telas veem o novo boost

T=310s  Usuário faz pull-to-refresh
        └─> fetchBoostedIds(forceRefresh=true)
            └─> Cache MISS (310s > 5min)
            └─> Busca do servidor
            └─> Atualiza: lastFetch = T=310s
```

---

## 🎨 VISUALIZAÇÃO DO FLUXO DE DADOS

```
┌──────────────────────────────────────────────────────────┐
│                    APLICATIVO                            │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐   │
│  │ HomeScreen │    │ Discover   │    │ BoostPay   │   │
│  │            │    │ Screen     │    │ Screen     │   │
│  └─────┬──────┘    └─────┬──────┘    └─────┬──────┘   │
│        │                  │                  │           │
│        │ read             │ read             │ write     │
│        ▼                  ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐   │
│  │           ZUSTAND STORE (RAM)                   │   │
│  │  boostedPropertyIds: Set(['abc', 'def'])       │   │
│  │  lastFetch: 1704067200000                      │   │
│  │  loading: false                                 │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │                                     │
└───────────────────┼─────────────────────────────────────┘
                    │
                    │ fetch (se cache expirou)
                    ▼
         ┌──────────────────────┐
         │   SUPABASE           │
         │  (PostgreSQL)        │
         │                      │
         │  property_boosts     │
         │  ┌────────────────┐ │
         │  │ id | property  │ │
         │  │ 1  | abc       │ │
         │  │ 2  | def       │ │
         │  └────────────────┘ │
         └──────────────────────┘
```

---

## 🧪 EXEMPLO PRÁTICO COMPLETO

### **Cenário: Usuário impulsiona um anúncio**

```javascript
// 1. BoostPaymentScreen.js - Pagamento aprovado
const addBoost = useBoostsStore(state => state.addBoost);
addBoost('property-123'); // ⚡ INSTANTÂNEO

// O que acontece internamente:
// stores/boostsStore.js
addBoost: (propertyId) => {
    const { boostedPropertyIds } = get(); // Pega estado atual
    const newIds = new Set(boostedPropertyIds); // Cria cópia
    newIds.add(propertyId); // Adiciona novo ID
    
    set({ boostedPropertyIds: newIds }); // Atualiza store
    // ↑ Zustand notifica TODOS os componentes inscritos
}

// 2. HomeScreen.js - Atualiza AUTOMATICAMENTE
const isBoosted = useBoostsStore(state => state.isBoosted);
const isPropertyBoosted = isBoosted('property-123'); // true ✅
// Badge "🚀 DESTAQUE" aparece IMEDIATAMENTE

// 3. DiscoverScreen.js - Atualiza AUTOMATICAMENTE
// Propriedade aparece na lista de destaques
// SEM refresh manual, SEM loading
```

---

## 📊 COMPARAÇÃO: COM vs SEM ZUSTAND

### **SEM ZUSTAND (useState local):**

```javascript
// HomeScreen.js
const [boosts, setBoosts] = useState([]);
useEffect(() => {
    fetch('/api/boosts').then(setBoosts); // Chamada 1
}, []);

// DiscoverScreen.js
const [boosts, setBoosts] = useState([]);
useEffect(() => {
    fetch('/api/boosts').then(setBoosts); // Chamada 2 (duplicada!)
}, []);

// Problemas:
// ❌ 2 chamadas para os mesmos dados
// ❌ Dados podem ficar dessincronizados
// ❌ Código duplicado
// ❌ Difícil manter consistência
```

### **COM ZUSTAND:**

```javascript
// HomeScreen.js
const boosts = useBoostsStore(state => state.boostedPropertyIds);
useEffect(() => {
    fetchBoostedIds(); // Usa cache se disponível
}, []);

// DiscoverScreen.js
const boosts = useBoostsStore(state => state.boostedPropertyIds);
useEffect(() => {
    fetchBoostedIds(); // Cache HIT! Sem chamada ao servidor
}, []);

// Benefícios:
// ✅ 1 chamada (cache reutilizado)
// ✅ Sempre sincronizado
// ✅ Código centralizado
// ✅ Fácil manutenção
```

---

## 🎯 BENEFÍCIOS ALCANÇADOS NO PROJETO

### **📉 Redução de Chamadas ao Servidor**

| Cenário | **Antes** | **Depois** | **Redução** |
|---------|-----------|------------|-------------|
| Abrir Home | 1 chamada | 1 chamada (cache 5min) | 0% |
| Paginar Home (10 páginas) | 10 chamadas | 1 chamada | **90%** |
| Home → Destaques | 2 chamadas | 1 chamada | **50%** |
| Home → Destaques → Home | 3 chamadas | 1 chamada | **67%** |
| **Total médio** | - | - | **~60-70%** |

### **⚡ Performance**

- ✅ **Cache de 5 minutos** - dados frescos sem sobrecarga
- ✅ **Verificação O(1)** - `Set.has()` é instantâneo
- ✅ **Atualização otimista** - UI responde imediatamente
- ✅ **Sincronização automática** - todas as telas sempre atualizadas

### **🧹 Código Mais Limpo**

- ✅ **DRY** - lógica centralizada no store
- ✅ **Menos estados locais** - menos bugs
- ✅ **Consistente** - mesma arquitetura para favoritos e boosts
- ✅ **Bem documentado** - JSDoc completo

---

## 📝 LOGS PARA MONITORAR

```javascript
// Cache hit
[BoostsStore] 📦 Usando cache de IDs boosted

// Cache miss (busca do servidor)
[BoostsStore] 🔄 Buscando IDs boosted do servidor...
[BoostsStore] ✅ 5 IDs boosted carregados

// Atualização otimista
[BoostsStore] ✨ Boost adicionado (otimista): property-id-123

// Invalidação de cache
[BoostsStore] 🔄 Cache invalidado - próxima busca será do servidor
```

---

## 🎯 RESUMO FINAL

### **Zustand é:**

1. **Uma caixa de memória compartilhada** entre todas as telas
2. **Armazenada na RAM** do dispositivo (não no disco)
3. **Automática** - notifica componentes quando dados mudam
4. **Rápida** - acesso instantâneo (0ms)
5. **Inteligente** - cache automático, re-renders otimizados

### **Fluxo simplificado:**

```
Componente → useBoostsStore → Zustand Store → Dados
                                    ↓
                              (se necessário)
                                    ↓
                              Supabase
```

### **Quando usa cache:**

- ✅ Última busca foi há menos de 5 minutos
- ✅ Dados já estão no store

### **Quando busca do servidor:**

- ❌ Primeira vez que abre o app
- ❌ Cache expirou (> 5 minutos)
- ❌ Usuário fez pull-to-refresh
- ❌ `forceRefresh=true` foi passado

---

## 📚 REFERÊNCIAS

- [Documentação Oficial do Zustand](https://github.com/pmndrs/zustand)
- [Zustand vs Redux](https://github.com/pmndrs/zustand#comparison-with-redux)
- [Best Practices](https://github.com/pmndrs/zustand/wiki/Best-Practices)

---

**Última atualização:** Janeiro 2025  
**Autor:** Equipe BuscaBusca Imóveis

