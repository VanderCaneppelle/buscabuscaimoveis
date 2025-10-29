# 🔍 Diagnóstico - Sistema de Notificações In-App

## 📋 Problemas Relatados

1. ❌ Não consegue marcar como lida
2. ❌ Novas notificações não estão sendo criadas
3. ❌ Notificações não aparecem

---

## 🔎 Análise Completa do Fluxo

### **1. Criação de Notificações** ✅

**Onde são criadas:**

- `backend/api/admin/approve.js` - Quando anúncio é aprovado
- `backend/api/admin/reject.js` - Quando anúncio é rejeitado

**Código:**

```javascript
// approve.js (linha 48-59)
const { error: notificationError } = await supabase
    .from("in_app_notifications")
    .insert({
        user_id: data.user_id,
        type: "property_approved",
        title: "Anúncio Aprovado!",
        message: `Seu anúncio "${data.title}" foi aprovado e está ativo.`,
        data: {
            property_id: propertyId,
            property_title: data.title,
        },
    });
```

**Status**: ✅ Código correto

---

### **2. Buscar Notificações** ✅

**Frontend:**

```javascript
// NotificationsScreen.js (linha 131-147)
const loadNotifications = async () => {
    const data = await InAppNotificationAPI.getNotifications(user.id);
    setNotifications(data);
};
```

**Backend API:**

```javascript
// backend/api/in-app-notifications.js
GET /api/in-app-notifications?action=get&userId=xxx
```

**Status**: ✅ Implementado corretamente

---

### **3. Marcar como Lida** ⚠️

**Frontend:**

```javascript
// NotificationsScreen.js (linha 155-166)
const handleMarkAsRead = async (notification) => {
    if (notification.read) return;

    const success = await InAppNotificationAPI.markAsRead(notification.id);

    if (success) {
        setNotifications((prev) =>
            prev.map((n) => n.id === notification.id ? { ...n, read: true } : n)
        );
    }
};
```

**API Service:**

```javascript
// lib/inAppNotificationService.js (linha 58-78)
async markAsRead(notificationId) {
    const response = await fetch(
        `${API_URL}/api/in-app-notifications?action=mark-read`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId })
        }
    );
    return response.ok;
}
```

**Backend API**: Preciso verificar se existe...

**Status**: ⚠️ **POSSÍVEL PROBLEMA AQUI**

---

### **4. Realtime** ✅

**Configurado em NotificationsScreen.js (linha 58-129)**:

- ✅ INSERT - Adiciona novas notificações
- ✅ UPDATE - Atualiza notificações existentes
- ✅ DELETE - Remove notificações

**Status**: ✅ Configurado corretamente

---

### **5. RLS (Row Level Security)** ✅

**Políticas criadas:**

```sql
-- Usuários veem suas próprias notificações
CREATE POLICY "Users can view own notifications" 
    FOR SELECT USING (auth.uid() = user_id);

-- Usuários atualizam suas próprias
CREATE POLICY "Users can update own notifications" 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role insere
CREATE POLICY "Service role can insert notifications" 
    FOR INSERT WITH CHECK (true);
```

**Status**: ✅ Políticas corretas

---

## 🐛 Problemas Identificados

### **Problema 1: Backend API para marcar como lida**

Preciso verificar se o endpoint `mark-read` está implementado no backend.

**Arquivo**: `backend/api/in-app-notifications.js`

**O que deve ter**:

```javascript
async function handleMarkAsRead(req, res, service) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { notificationId } = req.body;

    if (!notificationId) {
        return res.status(400).json({ error: "notificationId is required" });
    }

    const result = await service.markAsRead(notificationId);

    if (result.success) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(500).json({ error: result.error });
    }
}
```

---

### **Problema 2: Backend Service markAsRead**

**Arquivo**: `backend/lib/inAppNotificationService.js`

**O que deve ter**:

```javascript
async markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('in_app_notifications')
            .update({ read: true })
            .eq('id', notificationId);
        
        if (error) throw error;
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

---

### **Problema 3: Notificações não são criadas**

**Possíveis causas:**

1. **Admin não está usando o backend correto**
   - Verificar se `backend/api/admin/approve.js` está sendo chamado
   - Verificar logs no console quando aprovar

2. **SERVICE_ROLE_KEY não configurado**
   - O backend usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
   - Verificar `.env` no backend:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

3. **RLS bloqueando inserção**
   - A política permite inserção via service role
   - Verificar se o backend está usando service_role_key

---

## ✅ Checklist de Verificação

### **No Supabase Dashboard:**

1. **Verificar se a tabela existe**:

```sql
SELECT * FROM in_app_notifications LIMIT 5;
```

2. **Verificar políticas RLS**:

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'in_app_notifications';
```

3. **Criar notificação manual** (teste):

```sql
INSERT INTO in_app_notifications (user_id, type, title, message)
VALUES (
    'SEU-USER-ID-AQUI',
    'property_approved',
    'Teste',
    'Notificação de teste'
);
```

4. **Verificar notificações existentes**:

```sql
SELECT id, user_id, type, title, read, created_at 
FROM in_app_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### **No Backend:**

1. **Verificar variáveis de ambiente**:

```bash
cd backend
cat .env | grep SUPABASE
```

2. **Verificar se endpoint mark-read existe**:

```bash
grep -r "mark-read" backend/api/
```

3. **Testar endpoint manualmente**:

```bash
curl -X POST http://localhost:3000/api/in-app-notifications?action=mark-read \
  -H "Content-Type: application/json" \
  -d '{"notificationId": "uuid-aqui"}'
```

### **No App:**

1. **Verificar console** quando carregar notificações:

```
📱 Primeira carga de notificações
🔔 [NotificationsScreen] Carregando notificações para user: xxx
🔔 [NotificationsScreen] Notificações carregadas: X
```

2. **Verificar console** ao aprovar anúncio (admin):

```
✅ Aprovando propriedade: xxx
🔔 Criando notificação para user_id: xxx
✅ Notificação criada para o usuário
```

3. **Verificar console** ao marcar como lida:

```
✓ Marcando notificação xxx como lida
✅ Notificação marcada como lida
```

---

## 🔧 Correções Necessárias

Vou criar os arquivos faltantes:

1. ✅ Verificar `backend/api/in-app-notifications.js` - adicionar handler
   `mark-read`
2. ✅ Verificar `backend/lib/inAppNotificationService.js` - adicionar método
   `markAsRead`
3. ✅ Testar criação manual de notificação
4. ✅ Verificar logs do backend quando aprovar anúncio

---

## 📝 Próximos Passos

1. Ler arquivo `backend/api/in-app-notifications.js` completo
2. Verificar se handlers estão todos implementados
3. Criar correções necessárias
4. Testar fluxo completo

---

**Status**: 🔍 Diagnóstico em andamento...
