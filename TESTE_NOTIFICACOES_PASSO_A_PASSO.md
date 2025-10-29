# 🔍 Teste de Notificações In-App - Passo a Passo

## ⚠️ Problemas Relatados

- Não consegue marcar como lida
- Notificações não são criadas
- Notificações não aparecem

---

## 📝 Passo 1: Verificar Banco de Dados

### 1.1 Verificar se tabela existe

Acesse **Supabase Dashboard** > **SQL Editor** e execute:

```sql
-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'in_app_notifications'
ORDER BY ordinal_position;
```

**Esperado**: 9 colunas (id, user_id, type, title, message, data, read,
created_at, updated_at)

---

### 1.2 Verificar notificações existentes

```sql
-- Ver todas as notificações (últimas 20)
SELECT 
    id,
    user_id,
    type,
    title,
    read,
    created_at
FROM in_app_notifications
ORDER BY created_at DESC
LIMIT 20;
```

**Pergunta**: Existem notificações? Quantas?

---

### 1.3 Verificar políticas RLS

```sql
-- Ver políticas de segurança
SELECT 
    policyname,
    cmd as operacao,
    permissive,
    roles,
    qual as condicao
FROM pg_policies
WHERE tablename = 'in_app_notifications';
```

**Esperado**: 4 políticas

- Users can view own notifications (SELECT)
- Users can update own notifications (UPDATE)
- Service role can insert notifications (INSERT)
- Admins can view all notifications (SELECT)

---

### 1.4 Criar notificação de teste

```sql
-- SUBSTITUA 'SEU-USER-ID' pelo seu ID real
-- Para pegar seu user_id:
SELECT id, email FROM auth.users WHERE email = 'SEU-EMAIL-AQUI';

-- Criar notificação de teste
INSERT INTO in_app_notifications (
    user_id,
    type,
    title,
    message,
    data
) VALUES (
    'SEU-USER-ID-AQUI',  -- ⚠️ SUBSTITUIR
    'property_approved',
    '🧪 Teste Manual',
    'Esta é uma notificação de teste criada manualmente',
    '{"test": true}'::jsonb
);

-- Verificar se foi criada
SELECT * FROM in_app_notifications 
WHERE title LIKE '%Teste Manual%';
```

**Resultado esperado**: 1 linha inserida

---

## 📱 Passo 2: Testar no App

### 2.1 Abrir tela de notificações

1. Abra o app
2. Vá para a **Home**
3. Clique no **sininho** (ícone de notificação)

**Console esperado**:

```
📱 Primeira carga de notificações
🔔 [NotificationsScreen] Carregando notificações para user: xxxxxxxx
📡 Status da subscrição Realtime (lista): SUBSCRIBED
🔔 [NotificationsScreen] Notificações carregadas: X
```

**Pergunta**: A notificação de teste apareceu?

---

### 2.2 Testar marcar como lida

1. Clique em uma notificação não lida
2. Observe o console

**Console esperado**:

```
✓ Marcando notificação xxxxxxxx... como lida
✅ Notificação marcada como lida
🔄 Notificação atualizada via Realtime! {...}
```

**Pergunta**: A notificação ficou marcada como lida (ícone mudou de azul para
cinza)?

---

### 2.3 Verificar no banco

Após marcar como lida no app, verifique no banco:

```sql
SELECT id, title, read, updated_at
FROM in_app_notifications
WHERE title LIKE '%Teste Manual%';
```

**Esperado**: `read = true`

---

## 🛠️ Passo 3: Testar Criação Automática

### 3.1 Criar e aprovar um anúncio

1. **Criar um anúncio** no app (se não tiver nenhum pendente)
2. Acesse o **painel admin** (http://localhost:3000/admin ou seu domínio)
3. **Aprove** o anúncio

**Console do backend esperado**:

```
✅ Aprovando propriedade: xxxxxxxx
🔔 Criando notificação para user_id: xxxxxxxx
🔔 Título da propriedade: Nome do Imóvel
✅ Notificação criada para o usuário
```

---

### 3.2 Verificar se notificação apareceu

1. Volte para o app
2. Vá para tela de notificações
3. A notificação deve aparecer **automaticamente** (Realtime)

**Console do app esperado**:

```
🔔 [NotificationsScreen] Nova notificação recebida via Realtime!
🔔 [NotificationsScreen] Tipo: property_approved
🔔 [NotificationsScreen] Título: Anúncio Aprovado!
🔔 [NotificationsScreen] Nova lista: X notificações
```

---

## 🐛 Diagnóstico de Problemas

### Problema: Notificações não aparecem

**Possíveis causas:**

1. **Realtime não conectado**
   - Console mostra: `📡 Status da subscrição Realtime (lista): SUBSCRIBED`?
   - Se não, verificar conexão Supabase

2. **User ID incorreto**
   - Verificar se `user.id` no app corresponde ao `user_id` no banco
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'SEU-EMAIL';
   ```

3. **RLS bloqueando**
   - Testar com query direto:
   ```sql
   SELECT * FROM in_app_notifications 
   WHERE user_id = 'SEU-USER-ID';
   ```

---

### Problema: Não marca como lida

**Possíveis causas:**

1. **Backend não está respondendo**
   - Verificar console: `✓ Marcando notificação...`
   - Se aparece erro, verificar backend logs

2. **Endpoint não existe**
   - Testar manualmente:
   ```bash
   curl -X POST https://seu-dominio.vercel.app/api/in-app-notifications?action=mark-read \
     -H "Content-Type: application/json" \
     -d '{"notificationId": "NOTIFICATION-ID-AQUI"}'
   ```

3. **RLS bloqueando UPDATE**
   - Verificar política UPDATE:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'in_app_notifications' 
   AND cmd = 'UPDATE';
   ```

---

### Problema: Notificações não são criadas (admin)

**Possíveis causas:**

1. **SERVICE_ROLE_KEY não configurado**
   - Verificar `.env` no backend Vercel
   - Deve ter: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...`

2. **Admin API não está sendo chamado**
   - Verificar se admin usa endpoints corretos:
     - `/api/admin/approve`
     - `/api/admin/reject`

3. **Erro silencioso**
   - Verificar logs no Vercel
   - Verificar console do browser (painel admin)

---

## ✅ Checklist Final

- [ ] Tabela `in_app_notifications` existe
- [ ] Políticas RLS configuradas (4 políticas)
- [ ] Notificação de teste criada manualmente
- [ ] Notificação aparece no app
- [ ] Realtime conectado (console: SUBSCRIBED)
- [ ] Consegue marcar como lida
- [ ] Notificação é criada ao aprovar anúncio (admin)
- [ ] Notificação aparece automaticamente (Realtime)

---

## 📞 Próximos Passos

Execute cada passo acima e me informe:

1. **Passo 1.2**: Quantas notificações existem no banco?
2. **Passo 1.4**: Notificação de teste foi criada?
3. **Passo 2.1**: Notificação aparece no app?
4. **Passo 2.2**: Console mostra "marcada como lida"?
5. **Passo 3.1**: Backend cria notificação ao aprovar?
6. **Passo 3.2**: Notificação aparece via Realtime?

---

**Com essas informações, posso identificar exatamente onde está o problema!** 🎯
