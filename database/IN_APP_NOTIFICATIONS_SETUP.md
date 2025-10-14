# 📱 Setup do Sistema de Notificações In-App

## 📋 Passo a Passo para Configurar o Banco de Dados

### 1️⃣ Executar o Script SQL

1. Acesse o **Supabase Dashboard** do seu projeto
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Copie todo o conteúdo do arquivo `database/in_app_notifications.sql`
5. Cole no editor
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

### 2️⃣ Verificar a Criação

Você deve ver a mensagem:

```
✅ Tabela in_app_notifications criada com sucesso!
```

### 3️⃣ Validar a Estrutura

Execute este query para verificar:

```sql
-- Verificar se a tabela existe
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'in_app_notifications'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'in_app_notifications';

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'in_app_notifications';
```

## 📊 Estrutura da Tabela

| Coluna       | Tipo        | Descrição                                                                           |
| ------------ | ----------- | ----------------------------------------------------------------------------------- |
| `id`         | UUID        | ID único da notificação                                                             |
| `user_id`    | UUID        | ID do usuário que receberá a notificação                                            |
| `type`       | VARCHAR(50) | Tipo: `property_approved`, `property_rejected`, `plan_expiring`, `whatsapp_contact` |
| `title`      | TEXT        | Título da notificação                                                               |
| `message`    | TEXT        | Mensagem completa                                                                   |
| `data`       | JSONB       | Dados adicionais (property_id, reason, etc)                                         |
| `read`       | BOOLEAN     | Se foi lida ou não                                                                  |
| `created_at` | TIMESTAMP   | Data/hora de criação                                                                |
| `updated_at` | TIMESTAMP   | Data/hora da última atualização                                                     |

## 🔒 Políticas de Segurança (RLS)

- ✅ **Usuários** podem ver **apenas suas próprias** notificações
- ✅ **Usuários** podem **atualizar apenas suas próprias** notificações (marcar
  como lida)
- ✅ **Service Role** (backend) pode **inserir** notificações
- ✅ **Admins** podem **ver todas** as notificações (para relatórios)

## 🧹 Manutenção

### Limpar Notificações Antigas (Opcional)

Para remover notificações lidas com mais de 30 dias:

```sql
SELECT cleanup_old_notifications();
```

### Contar Notificações Não Lidas

Para ver quantas notificações não lidas um usuário tem:

```sql
SELECT count_unread_notifications('uuid-do-usuario');
```

## ✅ Checklist de Validação

- [ ] Script executado sem erros
- [ ] Tabela `in_app_notifications` criada
- [ ] 4 políticas RLS ativas
- [ ] 4 índices criados
- [ ] Trigger de `updated_at` funcionando

## 🚀 Próximos Passos

Após executar este script com sucesso, você pode prosseguir para a **FASE 2:
Backend** (criação dos serviços e APIs).

## ❓ Troubleshooting

### Erro: "relation already exists"

Se a tabela já existe, você pode:

```sql
DROP TABLE IF EXISTS in_app_notifications CASCADE;
```

E executar o script novamente.

### Erro: "must be owner of table"

Certifique-se de estar logado com uma conta que tem permissão de admin no
Supabase.

### RLS não está funcionando

Verifique se RLS está habilitado:

```sql
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
```

## 📞 Suporte

Se encontrar problemas, verifique:

1. Conexão com Supabase
2. Permissões do usuário
3. Logs de erro no SQL Editor
