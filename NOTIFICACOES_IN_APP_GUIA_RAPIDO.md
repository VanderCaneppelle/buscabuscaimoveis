# 📱 Notificações In-App - Guia Rápido

## 🚀 Quick Start (3 passos)

### 1. Executar SQL

```bash
Arquivo: database/in_app_notifications.sql
Local: Supabase Dashboard > SQL Editor
```

### 2. Testar

- Abra o app
- Veja o sininho no topo da HomeScreen
- Aprove/rejeite um anúncio no admin
- O usuário receberá uma notificação

### 3. Pronto! ✅

---

## 📊 Notificações Implementadas

| Tipo                 | Quando          | Quem Recebe      |
| -------------------- | --------------- | ---------------- |
| ✅ Anúncio Aprovado  | Admin aprova    | Dono do anúncio  |
| ❌ Anúncio Rejeitado | Admin rejeita   | Dono do anúncio  |
| ⚠️ Plano Expirando   | 5 dias antes    | Usuário do plano |
| 💬 Contato WhatsApp  | Clique no botão | Dono + Admins    |

---

## 📁 Arquivos Importantes

### Configuração

- `database/in_app_notifications.sql` ← **Executar primeiro!**
- `database/IN_APP_NOTIFICATIONS_SETUP.md` ← Documentação detalhada

### Backend

- `backend/lib/inAppNotificationService.js` ← Serviço principal
- `backend/api/in-app-notifications.js` ← API REST

### Frontend

- `lib/inAppNotificationService.js` ← Cliente
- `components/NotificationBell.js` ← Sininho
- `components/NotificationsScreen.js` ← Tela completa

### Integrações

- `admin/moderationService.js` ← Aprovação/Rejeição
- `backend/scripts/send-expiration-reminder.js` ← Planos
- `components/PropertyDetailsScreen.js` ← WhatsApp

---

## 🎨 Interface

### Sininho (HomeScreen)

- Badge vermelho com número de não lidas
- Atualiza automaticamente a cada 30s
- Clique para abrir tela de notificações

### Tela de Notificações

- Lista todas as notificações
- Não lidas em azul claro
- Clique para marcar como lida
- Long press para excluir
- "Marcar todas como lidas" no topo

---

## 🔧 API Rápida

```javascript
// Criar notificação
POST /api/in-app-notifications?action=create
{ userId, type, title, message, data }

// Buscar notificações
GET /api/in-app-notifications?action=get&userId=xxx

// Marcar como lida
POST /api/in-app-notifications?action=mark-read
{ notificationId }

// Contar não lidas
GET /api/in-app-notifications?action=count-unread&userId=xxx
```

---

## ⚙️ Configurações

### Desabilitar notificações de admin no WhatsApp

`components/PropertyDetailsScreen.js` - linha 256

```javascript
// Comentar este bloco
```

### Alterar frequência de atualização

`components/NotificationBell.js` - linha 43

```javascript
30000; // 30 segundos → alterar para outro valor
```

---

## 🐛 Problemas Comuns

**Sininho não aparece**

- Usuário não está logado?
- Console tem erros?

**Notificações não são criadas**

- SQL foi executado?
- RLS está configurado?

**Contador não atualiza**

- Aguarde 30 segundos
- Ou faça pull-to-refresh

---

## 📚 Documentação Completa

Ver: `docs/IN_APP_NOTIFICATIONS_COMPLETO.md`

---

## ✅ Status: COMPLETO

Todas as 4 fases implementadas:

1. ✅ Banco de Dados
2. ✅ Backend
3. ✅ Integrações
4. ✅ Frontend

**Pronto para produção!** 🎉
