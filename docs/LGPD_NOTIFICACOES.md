# 🔒 LGPD - Privacidade nas Notificações In-App

## ⚖️ Conformidade com a LGPD

Este documento explica como o sistema de notificações in-app está em
conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

---

## 🎯 Princípios Aplicados

### 1. **Minimização de Dados** (Art. 6º, III)

- Coletamos e compartilhamos apenas o mínimo necessário
- Nome do usuário NÃO é compartilhado com o dono do imóvel

### 2. **Finalidade** (Art. 6º, I)

- Admins veem nome apenas para fins de **moderação e segurança**
- Dono do imóvel não precisa saber quem é o interessado

### 3. **Segurança** (Art. 6º, VII)

- Dados pessoais protegidos por RLS (Row Level Security)
- Apenas pessoas autorizadas têm acesso

---

## 📱 Como Funciona

### **Quando Usuário Clica em "WhatsApp"**

#### **Notificação para o Dono do Imóvel:**

```
💬 Novo Interessado!
Um usuário demonstrou interesse no seu anúncio 
"Casa 3 quartos" e clicou no botão de WhatsApp!
```

**✅ LGPD Respeitada:**

- Nome do interessado NÃO é revelado
- Dono sabe que há interesse, mas não identifica a pessoa
- Privacidade do interessado protegida

---

#### **Notificação para Admins:**

```
📊 Novo Contato no Sistema
João Silva demonstrou interesse no imóvel 
"Casa 3 quartos" anunciado por Maria Santos via WhatsApp.
```

**✅ LGPD Respeitada:**

- Nome é mostrado apenas para fins de **moderação**
- Base legal: **Legítimo Interesse** (Art. 7º, IX)
- Necessário para segurança e prevenção de fraudes

---

## 📋 Bases Legais (Art. 7º LGPD)

### **Para Dono do Imóvel:**

- ✅ **Execução de Contrato** (Art. 7º, V)
  - Notificação faz parte do serviço contratado

### **Para Admins:**

- ✅ **Legítimo Interesse** (Art. 7º, IX)
  - Segurança do sistema
  - Prevenção de fraudes
  - Moderação de conteúdo
  - Analytics e melhorias

---

## 🔐 Medidas de Segurança

### **1. Row Level Security (RLS)**

- Cada usuário vê apenas suas próprias notificações
- Admins têm acesso separado e controlado

### **2. Dados Armazenados**

```json
{
    "property_id": "uuid",
    "property_title": "Casa 3 quartos",
    "contact_type": "whatsapp",
    "interested_user_name": "João Silva", // Apenas em admin notifications
    "owner_name": "Maria Santos",
    "is_admin_notification": true
}
```

### **3. Anonimização**

- Nome do interessado é omitido para o dono
- Dados são armazenados apenas o necessário
- Cleanup automático após 30 dias (notificações lidas)

---

## 🎓 Justificativa Técnica

### **Por que Admins Veem o Nome?**

1. **Segurança:** Identificar comportamentos suspeitos
2. **Moderação:** Agir em casos de abuso
3. **Suporte:** Auxiliar usuários em caso de problemas
4. **Analytics:** Entender padrões de uso
5. **Compliance:** Atender requisições legais

### **Por que Dono NÃO Vê o Nome?**

1. **Não é necessário:** Dono não precisa saber quem é para responder
2. **Privacidade:** Usuário não autorizou compartilhar identidade
3. **Minimização:** LGPD exige usar o mínimo de dados necessário
4. **Segurança:** Evita perseguição ou contato indesejado

---

## 📊 Fluxo de Dados

```
Usuário Clica WhatsApp
    ↓
Sistema busca nome (profiles)
    ↓
    ├─→ Notifica DONO: "Um usuário..." (SEM nome)
    └─→ Notifica ADMINS: "João Silva..." (COM nome)
```

---

## 🔄 Retenção de Dados

### **Notificações Lidas:**

- Mantidas por **30 dias**
- Após 30 dias: **deletadas automaticamente**

### **Notificações Não Lidas:**

- Mantidas **indefinidamente** até serem lidas
- Usuário pode deletar manualmente a qualquer momento

### **Cleanup Automático:**

```sql
-- Função que remove notificações antigas
SELECT cleanup_old_notifications();
-- Remove notificações lidas com mais de 30 dias
```

---

## 👤 Direitos do Titular (LGPD)

### **Usuários Podem:**

1. ✅ **Ver suas notificações** (Art. 18, II)
2. ✅ **Deletar notificações** (Art. 18, VI)
3. ✅ **Solicitar informações** sobre uso dos dados
4. ✅ **Revogar consentimento** (parando de usar o app)

### **Como Exercer:**

- Deletar: Long press na notificação
- Acessar: Tela de notificações (sininho 🔔)
- Dúvidas: Contato com suporte

---

## 📝 Política de Privacidade

### **O Que Deve Constar:**

```
"Ao utilizar nosso sistema de contato via WhatsApp:

1. O dono do imóvel será notificado que você demonstrou 
   interesse, mas NÃO verá seu nome.

2. Nossa equipe de moderação pode ter acesso ao seu nome 
   para fins de segurança e prevenção de fraudes 
   (Legítimo Interesse - LGPD Art. 7º, IX).

3. Você pode deletar suas notificações a qualquer momento.

4. Notificações lidas são automaticamente removidas após 30 dias."
```

---

## ✅ Checklist de Conformidade

- [x] Minimização de dados implementada
- [x] Base legal definida (Legítimo Interesse para admins)
- [x] Segurança via RLS
- [x] Retenção limitada (30 dias)
- [x] Direito de exclusão implementado
- [x] Anonimização para não-admins
- [x] Documentação completa
- [x] Auditoria possível (logs do backend)

---

## 🚨 Importante

### **NÃO Fazemos:**

- ❌ Compartilhar nome sem necessidade
- ❌ Vender ou compartilhar dados com terceiros
- ❌ Usar dados para fins não relacionados ao serviço
- ❌ Manter dados indefinidamente

### **Fazemos:**

- ✅ Proteger dados com segurança adequada
- ✅ Usar apenas o necessário
- ✅ Dar transparência ao usuário
- ✅ Permitir controle sobre seus dados
- ✅ Deletar dados antigos automaticamente

---

## 📞 Contato DPO/Encarregado

Em caso de dúvidas sobre privacidade:

- Email: [seu-email-dpo@exemplo.com]
- Assunto: "LGPD - Notificações In-App"

---

## 📚 Referências Legais

- **LGPD:** Lei nº 13.709/2018
- **Art. 6º:** Princípios (Minimização, Finalidade, Segurança)
- **Art. 7º:** Bases Legais (Legítimo Interesse, Execução de Contrato)
- **Art. 18:** Direitos do Titular

---

**Última Atualização:** 14/10/2025\
**Versão:** 1.0.0\
**Status:** ✅ Conforme LGPD
