# 🚀 Guia Rápido - Filtros de Anunciantes

## ⚠️ ANTES DE TESTAR

### 1️⃣ **Executar SQLs no Supabase** (OBRIGATÓRIO)

Abra o **SQL Editor** do Supabase e execute:

#### **SQL 1: Função de Construtoras**

```sql
-- Cole o conteúdo completo de:
-- database/create_get_developers_with_properties_function.sql
```

#### **SQL 2: Função de Corretores**

```sql
-- Cole o conteúdo completo de:
-- database/create_get_realtors_with_properties_function.sql
```

---

## 📱 Como Usar

### **Tela Inicial (HomeScreen)**

```
┌─────────────────────────────────────────┐
│        [Buscar imóveis...]      🔍      │
│                                          │
│  [Todos] [Construtoras] [Corretores]   │
│            [Proprietários]               │
│                                          │
│  [🔧 Filtros]  [🗺️ Ver Mapa]  [Limpar] │
└─────────────────────────────────────────┘
```

---

## 🎯 Testando Cada Filtro

### ✅ **1. TODOS** (Padrão)

- Mostra todos os imóveis
- Botão fica azul quando ativo

### ✅ **2. CONSTRUTORAS**

**Ação:** Clique em "Construtoras"

**O que acontece:**

1. Abre modal com lista de construtoras
2. Mostra apenas construtoras que TÊM imóveis
3. Cada item mostra:
   - Nome da construtora
   - Cidade/UF
   - Quantidade de imóveis

**Como usar:**

- 🔍 **Buscar:** Digite no campo de busca
- ✅ **Selecionar:** Toque em uma construtora
- 🗑️ **Limpar:** Botão "Limpar Filtro" volta para "Todos"

**Resultado:**

- Modal fecha
- Lista mostra APENAS imóveis da construtora
- Botão "Construtoras" fica azul

---

### ✅ **3. CORRETORES**

**Ação:** Clique em "Corretores"

**O que acontece:**

1. Abre modal com lista de corretores
2. Mostra apenas corretores que TÊM imóveis
3. Cada item mostra:
   - Nome do corretor
   - Email
   - Quantidade de imóveis

**Como usar:**

- 🔍 **Buscar:** Digite no campo de busca
- ✅ **Selecionar:** Toque em um corretor
- 🗑️ **Limpar:** Botão "Limpar Filtro" volta para "Todos"

**Resultado:**

- Modal fecha
- Lista mostra APENAS imóveis do corretor
- Botão "Corretores" fica azul

---

### ✅ **4. PROPRIETÁRIOS**

**Ação:** Clique em "Proprietários"

**O que acontece:**

- ⚡ **Sem modal** - aplica direto
- Lista mostra APENAS imóveis de pessoas físicas (não corretores)
- Botão "Proprietários" fica azul

**Quem são proprietários?**

- Usuários com `is_realtor = false`
- Usuários com `is_realtor = null`

---

## 🧪 Checklist de Teste

### **Teste Visual**

- [ ] 4 botões aparecem abaixo da busca
- [ ] Botão ativo fica azul com texto branco
- [ ] Botões inativos ficam cinza claro com texto azul
- [ ] Ícones mudam de cor conforme o estado

### **Teste "Construtoras"**

- [ ] Modal abre corretamente
- [ ] Lista aparece (se houver construtoras com imóveis)
- [ ] Busca filtra a lista
- [ ] Selecionar construtora fecha modal
- [ ] Filtro é aplicado (apenas imóveis da construtora)
- [ ] Contador de imóveis está correto
- [ ] "Limpar Filtro" volta para "Todos"

### **Teste "Corretores"**

- [ ] Modal abre corretamente
- [ ] Lista aparece (se houver corretores com imóveis)
- [ ] Busca filtra a lista
- [ ] Selecionar corretor fecha modal
- [ ] Filtro é aplicado (apenas imóveis do corretor)
- [ ] Contador de imóveis está correto
- [ ] "Limpar Filtro" volta para "Todos"

### **Teste "Proprietários"**

- [ ] Filtro aplica sem modal
- [ ] Lista mostra apenas imóveis de não-corretores
- [ ] Botão fica azul

### **Teste de Integração**

- [ ] Alternar entre filtros funciona
- [ ] Botão "Limpar" volta sempre para "Todos"
- [ ] Busca é limpa ao aplicar filtro rápido
- [ ] Filtros avançados são resetados ao aplicar filtro rápido
- [ ] Pull to refresh mantém filtro ativo
- [ ] Scroll infinito funciona com filtro

### **Teste de Navegação**

- [ ] Voltar para "Todos" mostra todos os imóveis novamente
- [ ] Ir para outra tab e voltar mantém filtro
- [ ] Fechar app e reabrir reseta para "Todos"

---

## ❓ Possíveis Problemas

### **❌ Erro: "RPC function not found"**

**Causa:** SQLs não foram executados no Supabase\
**Solução:** Execute os 2 SQLs no SQL Editor do Supabase

### **❌ Modal de construtoras/corretores vazio**

**Causa 1:** Não há construtoras/corretores com imóveis ativos\
**Causa 2:** SQLs não foram executados\
**Solução:** Execute os SQLs ou cadastre imóveis vinculados

### **❌ Filtro "Proprietários" não mostra nada**

**Causa:** Todos os usuários são corretores (`is_realtor=true`)\
**Solução:** Normal se todos forem corretores

---

## 🎯 Resultados Esperados

### **Se tudo estiver correto:**

1. ✅ App inicia com "Todos" ativo
2. ✅ Clicar em "Construtoras" abre modal
3. ✅ Modal mostra lista (se houver dados)
4. ✅ Selecionar filtra corretamente
5. ✅ Botão ativo fica azul
6. ✅ "Limpar" volta para "Todos"
7. ✅ Performance mantida (cache funciona)

---

## 🚀 Próximos Passos

Após validar que tudo funciona:

1. ✅ Testar em diferentes dispositivos
2. ✅ Testar com dados reais
3. ✅ Validar performance com muitos imóveis
4. ✅ Testar edge cases (sem dados, erros de rede)

---

**Status:** ✅ Pronto para teste\
**Data:** 29 de Outubro de 2025
