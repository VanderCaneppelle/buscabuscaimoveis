# 📊 USER PLAN STORE - GUIA DE USO

> Store centralizado para gerenciar informações de plano e permissões do usuário

---

## 🎯 PROBLEMA QUE RESOLVE

### **ANTES (Problema):**

```javascript
// AdvertiseScreen.js
const eligibility = await PlanService.getUserEligibility(user.id); // Chamada 1

// CreateAdScreen.js
const eligibility = await PlanService.getUserEligibility(user.id); // Chamada 2 (DUPLICADA!)

// MyPropertiesScreen.js
const eligibility = await PlanService.getUserEligibility(user.id); // Chamada 3 (DUPLICADA!)

// AccountScreen.js
const eligibility = await PlanService.getUserEligibility(user.id); // Chamada 4 (DUPLICADA!)
```

**Problemas:**
- 🔴 **4+ chamadas ao banco** para os mesmos dados
- 🔴 **Dados dessincronizados** entre telas
- 🔴 **Código duplicado** em cada componente
- 🔴 **Loading em cada tela** - UX ruim
- 🔴 **Performance ruim** - cada navegação = nova chamada

---

### **DEPOIS (Solução):**

```javascript
// Qualquer tela
const canCreateAd = useUserPlanStore(state => state.canCreateAd);
const availableAds = useUserPlanStore(state => state.availableAds);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);

useEffect(() => {
    fetchUserPlanData(user.id); // Cache de 3 minutos
}, [user.id]);
```

**Benefícios:**
- ✅ **1 chamada** (cache reutilizado por 3 minutos)
- ✅ **Sempre sincronizado** em todas as telas
- ✅ **Código centralizado** - fácil manutenção
- ✅ **Sem loading repetido** - dados já em memória
- ✅ **Performance excelente** - acesso instantâneo

---

## 📦 DADOS DISPONÍVEIS NO STORE

### **Informações do Plano:**

```javascript
const plan = useUserPlanStore(state => state.plan);
// { id, name, display_name, max_ads, period, price, ... }

const planStatus = useUserPlanStore(state => state.planStatus);
// 'active', 'expired', 'cancelled', 'free'

const planEndDate = useUserPlanStore(state => state.planEndDate);
// '2025-12-31T23:59:59.000Z'

const daysRemaining = useUserPlanStore(state => state.daysRemaining);
// 45

const isFreePlan = useUserPlanStore(state => state.isFreePlan);
// true/false

const isPlanExpired = useUserPlanStore(state => state.isPlanExpired);
// true/false
```

### **Contadores de Anúncios:**

```javascript
const currentAds = useUserPlanStore(state => state.currentAds);
// 3 (anúncios ativos)

const maxAds = useUserPlanStore(state => state.maxAds);
// 5 (limite do plano)

const availableAds = useUserPlanStore(state => state.availableAds);
// 2 (disponíveis para criar)

const inactiveAds = useUserPlanStore(state => state.inactiveAds);
// 1 (anúncios inativos)
```

### **Permissões:**

```javascript
const canCreateAd = useUserPlanStore(state => state.canCreateAd);
// true/false

const canManageAds = useUserPlanStore(state => state.canManageAds);
// true/false

const canBoostAd = useUserPlanStore(state => state.canBoostAd);
// true/false

const createAdReason = useUserPlanStore(state => state.createAdReason);
// "Você atingiu o limite de anúncios do seu plano"
```

---

## 🔧 COMO USAR EM CADA TELA

### **1. AdvertiseScreen (Tela Principal de Anúncios)**

**ANTES:**
```javascript
// ❌ Código antigo (REMOVER)
const [eligibility, setEligibility] = useState(null);
const [manageAdsInfo, setManageAdsInfo] = useState(null);

useEffect(() => {
    const checkPermissions = async () => {
        const eligibilityData = await PlanService.getUserEligibility(user.id);
        const manageResult = await PlanService.userCanManageAds(user.id);
        setEligibility(eligibilityData);
        setManageAdsInfo(manageResult);
    };
    checkPermissions();
}, [user.id]);
```

**DEPOIS:**
```javascript
// ✅ Código novo (USAR)
import { useUserPlanStore } from '../stores/userPlanStore';

const canCreateAd = useUserPlanStore(state => state.canCreateAd);
const canManageAds = useUserPlanStore(state => state.canManageAds);
const availableAds = useUserPlanStore(state => state.availableAds);
const currentAds = useUserPlanStore(state => state.currentAds);
const maxAds = useUserPlanStore(state => state.maxAds);
const planName = useUserPlanStore(state => state.plan?.display_name);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
const loading = useUserPlanStore(state => state.loading);

useEffect(() => {
    fetchUserPlanData(user.id); // Cache de 3 min
}, [user.id]);

// Usar diretamente
<Text>Plano: {planName}</Text>
<Text>Anúncios: {currentAds}/{maxAds}</Text>
<Text>Disponíveis: {availableAds}</Text>

<Button 
    disabled={!canCreateAd}
    onPress={handleCreateAd}
/>

<Button 
    disabled={!canManageAds}
    onPress={handleManageAds}
/>
```

---

### **2. CreateAdScreen (Criar Anúncio)**

**ANTES:**
```javascript
// ❌ Código antigo (REMOVER)
const [eligibility, setEligibility] = useState(null);

useEffect(() => {
    const checkPermissions = async () => {
        const info = await PlanService.getUserEligibility(user.id);
        setEligibility(info);
        if (!info.canCreate) {
            setShowPlanModal(true);
        }
    };
    checkPermissions();
}, [user.id]);
```

**DEPOIS:**
```javascript
// ✅ Código novo (USAR)
import { useUserPlanStore } from '../stores/userPlanStore';

const canCreateAd = useUserPlanStore(state => state.canCreateAd);
const createAdReason = useUserPlanStore(state => state.createAdReason);
const availableAds = useUserPlanStore(state => state.availableAds);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
const incrementAdCount = useUserPlanStore(state => state.incrementAdCount);

useEffect(() => {
    fetchUserPlanData(user.id);
    
    // Verificar permissão
    if (!canCreateAd) {
        setShowPlanModal(true);
    }
}, [user.id, canCreateAd]);

// Após criar anúncio com sucesso
const handleSubmit = async () => {
    // ... criar anúncio ...
    
    // ✅ Atualizar contador (atualização otimista)
    incrementAdCount();
    
    navigation.goBack();
};
```

---

### **3. MyPropertiesScreen (Gerenciar Anúncios)**

**ANTES:**
```javascript
// ❌ Código antigo (REMOVER)
const checkPermissions = async () => {
    const info = await PlanService.getUserEligibility(user.id);
    if (info.canCreate) {
        navigation.navigate('CreateAd');
    }
};
```

**DEPOIS:**
```javascript
// ✅ Código novo (USAR)
import { useUserPlanStore } from '../stores/userPlanStore';

const canCreateAd = useUserPlanStore(state => state.canCreateAd);
const availableAds = useUserPlanStore(state => state.availableAds);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
const decrementAdCount = useUserPlanStore(state => state.decrementAdCount);

useEffect(() => {
    fetchUserPlanData(user.id);
}, [user.id]);

// Botão criar anúncio
<Button 
    disabled={!canCreateAd}
    onPress={() => navigation.navigate('CreateAd')}
/>

// Após deletar anúncio
const handleDelete = async (propertyId) => {
    await PropertyService.deleteProperty(propertyId);
    
    // ✅ Atualizar contador (atualização otimista)
    decrementAdCount();
    
    // Atualizar lista
    loadProperties();
};
```

---

### **4. AccountScreen (Conta do Usuário)**

**ANTES:**
```javascript
// ❌ Código antigo (REMOVER)
const [eligibility, setEligibility] = useState(null);

useEffect(() => {
    const fetchEligibility = async () => {
        const info = await PlanService.getUserEligibility(user.id);
        setEligibility(info);
    };
    fetchEligibility();
}, [user.id]);
```

**DEPOIS:**
```javascript
// ✅ Código novo (USAR)
import { useUserPlanStore } from '../stores/userPlanStore';

const planSummary = useUserPlanStore(state => state.getPlanSummary());
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);

useEffect(() => {
    fetchUserPlanData(user.id);
}, [user.id]);

// Exibir informações
<Text>Plano: {planSummary.planName}</Text>
<Text>Status: {planSummary.status}</Text>
<Text>Expira em: {planSummary.daysRemaining} dias</Text>
<Text>Anúncios: {planSummary.ads.current}/{planSummary.ads.max}</Text>
```

---

### **5. DiscoverScreen (Impulsionar Anúncios)**

**ANTES:**
```javascript
// ❌ Código antigo (REMOVER)
const [userPlan, setUserPlan] = useState(null);

useEffect(() => {
    const loadUserPlan = async () => {
        const plan = await PlanService.getUserActivePlan(user.id);
        setUserPlan(plan);
    };
    loadUserPlan();
}, [user.id]);
```

**DEPOIS:**
```javascript
// ✅ Código novo (USAR)
import { useUserPlanStore } from '../stores/userPlanStore';

const canBoostAd = useUserPlanStore(state => state.canBoostAd);
const boostAdReason = useUserPlanStore(state => state.boostAdReason);
const isFreePlan = useUserPlanStore(state => state.isFreePlan);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);

useEffect(() => {
    fetchUserPlanData(user.id);
}, [user.id]);

// Mostrar CTA apenas para planos pagos
{canBoostAd && (
    <TouchableOpacity onPress={() => navigation.navigate('AdBoosting')}>
        <Text>Impulsionar Anúncios</Text>
    </TouchableOpacity>
)}

// Ou mostrar mensagem
{!canBoostAd && (
    <Text>{boostAdReason}</Text>
)}
```

---

### **6. PaymentDetailsScreen (Após Contratar Plano)**

```javascript
import { useUserPlanStore } from '../stores/userPlanStore';

const invalidateCache = useUserPlanStore(state => state.invalidateCache);

// Após pagamento aprovado
const handlePaymentSuccess = () => {
    // ✅ Invalidar cache para forçar nova busca
    invalidateCache();
    
    // Navegar
    navigation.navigate('Account');
};
```

---

## 🔄 FLUXO DE DADOS

### **Primeira Carga (Cache Miss):**

```
1. AdvertiseScreen monta
   └─> fetchUserPlanData(userId)
       └─> Cache MISS (primeira vez)
       └─> Busca do servidor (PlanService)
       └─> Salva no store
       └─> lastFetch = agora

2. Usuário navega para CreateAdScreen (30s depois)
   └─> fetchUserPlanData(userId)
       └─> Cache HIT (30s < 3min)
       └─> Retorna dados da RAM (INSTANTÂNEO)
       └─> SEM chamada ao servidor

3. Usuário navega para MyPropertiesScreen (1min depois)
   └─> fetchUserPlanData(userId)
       └─> Cache HIT (1min < 3min)
       └─> Retorna dados da RAM (INSTANTÂNEO)
       └─> SEM chamada ao servidor
```

**Resultado:**
- ✅ **1 chamada** ao servidor (vs 3 antes)
- ✅ **67% de redução** em chamadas
- ✅ **Dados sempre sincronizados**

---

### **Atualização Otimista (Criar/Deletar Anúncio):**

```
1. Usuário cria anúncio
   └─> PropertyService.createProperty()
   └─> incrementAdCount() ← INSTANTÂNEO
       └─> currentAds: 3 → 4
       └─> availableAds: 2 → 1
       └─> canCreateAd: true (ainda tem 1 disponível)

2. TODAS as telas atualizam AUTOMATICAMENTE
   ├─> AdvertiseScreen: "4/5 anúncios"
   ├─> CreateAdScreen: "1 disponível"
   └─> MyPropertiesScreen: Badge atualizado

3. Próxima navegação
   └─> fetchUserPlanData() busca dados atualizados do servidor
   └─> Confirma os números (ou corrige se houver divergência)
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### **Cenário: Usuário navega entre 5 telas**

| Tela | **ANTES** | **DEPOIS** | **Economia** |
|------|-----------|------------|--------------|
| AdvertiseScreen | 2 chamadas | 1 chamada | 50% |
| CreateAdScreen | 1 chamada | 0 chamadas (cache) | 100% |
| MyPropertiesScreen | 1 chamada | 0 chamadas (cache) | 100% |
| AccountScreen | 1 chamada | 0 chamadas (cache) | 100% |
| DiscoverScreen | 1 chamada | 0 chamadas (cache) | 100% |
| **TOTAL** | **6 chamadas** | **1 chamada** | **83%** |

### **Performance:**

| Métrica | **ANTES** | **DEPOIS** | **Melhoria** |
|---------|-----------|------------|--------------|
| Tempo de carregamento | ~300ms/tela | ~0ms (cache) | ⚡ Instantâneo |
| Chamadas ao banco | 6 | 1 | 🔥 83% menos |
| Sincronização | ❌ Manual | ✅ Automática | 🎯 100% |
| Código duplicado | 6 telas | 1 store | 🧹 83% menos |

---

## 🎯 QUANDO ATUALIZAR O CACHE

### **Invalidar cache (forçar nova busca):**

```javascript
const invalidateCache = useUserPlanStore(state => state.invalidateCache);

// Após ações importantes:
- Contratar novo plano → invalidateCache()
- Renovar plano → invalidateCache()
- Criar anúncio → incrementAdCount() (otimista)
- Deletar anúncio → decrementAdCount() (otimista)
- Plano expirar → invalidateCache()
```

### **Refresh manual (pull-to-refresh):**

```javascript
const refresh = useUserPlanStore(state => state.refresh);

const onRefresh = async () => {
    setRefreshing(true);
    await refresh(user.id); // Força busca do servidor
    setRefreshing(false);
};
```

---

## 📝 LOGS PARA MONITORAR

```javascript
// Cache hit
[UserPlanStore] 📦 Usando cache de dados do usuário

// Cache miss
[UserPlanStore] 🔄 Buscando dados do usuário do servidor...
[UserPlanStore] ✅ Dados carregados: { planName: 'Gold', currentAds: 3, maxAds: 5 }

// Atualização otimista
[UserPlanStore] 📊 Contador atualizado: { currentAds: 4, availableAds: 1 }

// Invalidação
[UserPlanStore] 🔄 Cache invalidado - próxima busca será do servidor

// Mudança de usuário
[UserPlanStore] 🔄 Usuário mudou, forçando refresh
```

---

## 🚀 MIGRAÇÃO PASSO A PASSO

### **Passo 1: Importar o store**

```javascript
import { useUserPlanStore } from '../stores/userPlanStore';
```

### **Passo 2: Remover estados locais**

```javascript
// ❌ REMOVER
const [eligibility, setEligibility] = useState(null);
const [manageAdsInfo, setManageAdsInfo] = useState(null);
const [loading, setLoading] = useState(true);
```

### **Passo 3: Usar seletores do Zustand**

```javascript
// ✅ ADICIONAR
const canCreateAd = useUserPlanStore(state => state.canCreateAd);
const canManageAds = useUserPlanStore(state => state.canManageAds);
const availableAds = useUserPlanStore(state => state.availableAds);
const fetchUserPlanData = useUserPlanStore(state => state.fetchUserPlanData);
const loading = useUserPlanStore(state => state.loading);
```

### **Passo 4: Remover chamadas duplicadas**

```javascript
// ❌ REMOVER
useEffect(() => {
    const checkPermissions = async () => {
        const eligibilityData = await PlanService.getUserEligibility(user.id);
        setEligibility(eligibilityData);
    };
    checkPermissions();
}, [user.id]);
```

### **Passo 5: Adicionar fetch do store**

```javascript
// ✅ ADICIONAR
useEffect(() => {
    fetchUserPlanData(user.id); // Cache de 3 min
}, [user.id]);
```

### **Passo 6: Atualizar referências**

```javascript
// ❌ ANTES
if (eligibility?.canCreate) { ... }
<Text>{eligibility?.planName}</Text>

// ✅ DEPOIS
if (canCreateAd) { ... }
<Text>{planName}</Text>
```

---

## 🎯 RESUMO

### **Benefícios:**
- ✅ **83% menos chamadas** ao banco de dados
- ✅ **Performance instantânea** (cache de 3 min)
- ✅ **Sincronização automática** entre telas
- ✅ **Código centralizado** - fácil manutenção
- ✅ **Atualização otimista** - UX melhor
- ✅ **Menos bugs** - uma fonte de verdade

### **Quando usar:**
- ✅ Verificar se pode criar anúncio
- ✅ Verificar se pode gerenciar anúncios
- ✅ Verificar se pode impulsionar anúncios
- ✅ Exibir contadores de anúncios
- ✅ Exibir informações do plano
- ✅ Habilitar/desabilitar botões

### **Quando NÃO usar:**
- ❌ Dados que mudam a cada segundo (use polling)
- ❌ Dados específicos de uma tela (use useState local)
- ❌ Dados que não são compartilhados

---

**Última atualização:** Janeiro 2025  
**Autor:** Equipe BuscaBusca Imóveis

