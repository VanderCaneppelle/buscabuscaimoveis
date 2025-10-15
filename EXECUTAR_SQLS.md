# 🚀 Como Ativar Tudo - Executar SQLs

## ⚡ Quick Start - 4 Scripts SQL

Execute **na ordem** no Supabase Dashboard → SQL Editor

---

## 📋 Ordem de Execução

### **1️⃣ Criar Tabela de Notificações**

```bash
Arquivo: database/in_app_notifications.sql
```

**O que faz:**

- Cria tabela `in_app_notifications`
- Configura RLS
- Cria índices
- Funções auxiliares

**Resultado esperado:**

```
✅ Tabela in_app_notifications criada com sucesso!
```

---

### **2️⃣ Habilitar Realtime - Notificações**

```bash
Arquivo: database/enable_realtime_notifications.sql
```

**O que faz:**

- Habilita Realtime para `in_app_notifications`

**Resultado esperado:**

```
✅ Realtime habilitado com sucesso para in_app_notifications!
```

---

### **3️⃣ Habilitar Realtime - Favoritos**

```bash
Arquivo: database/enable_realtime_favorites.sql
```

**O que faz:**

- Habilita Realtime para `favorites`
- Cria triggers de auto-remoção

**Resultado esperado:**

```
✅ Realtime habilitado com sucesso para tabela favorites!
✅ Triggers de auto-remoção criados com sucesso!
```

---

### **4️⃣ Habilitar Realtime - Properties**

```bash
Arquivo: database/enable_realtime_properties.sql
```

**O que faz:**

- Habilita Realtime para `properties`

**Resultado esperado:**

```
✅ Realtime habilitado com sucesso para tabela properties!
```

---

## ✅ Checklist

Após executar TODOS os 4 scripts:

- [ ] Script 1 executado sem erros
- [ ] Script 2 executado sem erros
- [ ] Script 3 executado sem erros
- [ ] Script 4 executado sem erros
- [ ] Verificado em Database → Replication:
  - [ ] `in_app_notifications` aparece
  - [ ] `favorites` aparece
  - [ ] `properties` aparece

---

## 🧪 Testar

### **Teste Rápido:**

1. **Notificações:**
   - Admin aprova anúncio
   - Veja notificação aparecer instantaneamente

2. **Favoritos:**
   - Favorita um imóvel
   - Admin exclui o imóvel
   - Veja favorito sumir automaticamente

3. **Lista:**
   - Admin aprova novo imóvel
   - Veja aparecer no topo da HomeScreen

---

## 🎯 Tudo Pronto!

Após executar os 4 SQLs, **tudo estará funcionando**:

- ✅ Notificações in-app
- ✅ Realtime (notificações, favoritos, properties)
- ✅ Auto-remoção de favoritos
- ✅ Lista sempre atualizada
- ✅ Multi-device sincronizado

---

## 📚 Documentação

**Guias Rápidos:**

- `NOTIFICACOES_IN_APP_GUIA_RAPIDO.md`
- `REALTIME_FAVORITOS_GUIA_RAPIDO.md`

**Documentação Completa:**

- Ver pasta `docs/`

**Resumo:**

- `RESUMO_IMPLEMENTACAO_COMPLETA.md`

---

**Boa sorte! 🎉**
