# Configuração do Banco de Dados - Supabase

## 📋 Passos para configurar o banco de dados:

### 1. Acessar o Dashboard do Supabase
- Vá para: https://supabase.com/dashboard
- Acesse seu projeto: `rxozhlxmfbioqgqomkrz`

### 2. Executar o Schema SQL
1. No dashboard, vá em **SQL Editor**
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `database/schema.sql`
4. Clique em **Run** para executar

### 3. Configurar as Políticas de Segurança
1. Crie uma nova query no **SQL Editor**
2. Copie e cole o conteúdo do arquivo `database/rls_policies.sql`
3. Clique em **Run** para executar

### 4. Verificar as Tabelas Criadas
1. Vá em **Table Editor**
2. Você deve ver as seguintes tabelas:
   - `plans` - Planos disponíveis
   - `subscriptions` - Assinaturas dos usuários
   - `properties` - Anúncios de imóveis
   - `payments` - Pagamentos
   - `favorites` - Favoritos dos usuários
   - `messages` - Mensagens entre usuários
   - `appointments` - Agendamentos de visita

### 5. Verificar os Dados Iniciais
1. Vá em **Table Editor** → `plans`
2. Você deve ver 3 planos criados:
   - Plano Bronze (R$ 29,90 - 2 anúncios)
   - Plano Prata (R$ 49,90 - 5 anúncios)
   - Plano Ouro (R$ 99,90 - 15 anúncios)

## 🔒 Políticas de Segurança Configuradas:

### **Usuários Comuns:**
- ✅ Podem ver apenas seus próprios dados
- ✅ Podem criar anúncios (status: pending)
- ✅ Podem editar anúncios pendentes
- ✅ Podem ver apenas anúncios aprovados
- ✅ Podem gerenciar favoritos
- ✅ Podem enviar/receber mensagens
- ✅ Podem criar agendamentos

### **Administradores:**
- ✅ Podem ver todos os dados
- ✅ Podem aprovar/rejeitar anúncios
- ✅ Podem gerenciar planos
- ✅ Podem ver todos os pagamentos

## 🚀 Próximos Passos:

1. **Testar a autenticação** no app
2. **Implementar CRUD de imóveis**
3. **Criar sistema de planos**
4. **Implementar aprovação de anúncios**
5. **Integrar com Mercado Pago**

## 📊 Estrutura das Tabelas:

### **plans**
- `id` - UUID único
- `name` - Nome do plano (bronze, prata, ouro)
- `display_name` - Nome para exibição
- `max_ads` - Limite de anúncios
- `price` - Preço do plano
- `features` - Array de funcionalidades

### **properties**
- `id` - UUID único
- `user_id` - ID do usuário proprietário
- `title` - Título do anúncio
- `description` - Descrição
- `price` - Preço
- `property_type` - Tipo (casa, apartamento, etc.)
- `transaction_type` - Venda ou aluguel
- `status` - pending, approved, rejected, inactive
- `images` - Array de URLs das imagens

### **subscriptions**
- `id` - UUID único
- `user_id` - ID do usuário
- `plan_id` - ID do plano
- `status` - active, cancelled, expired, pending
- `payment_status` - pending, paid, failed
- `start_date` - Data de início
- `end_date` - Data de término

## ⚠️ Importante:

- Todas as tabelas têm **Row Level Security (RLS)** habilitado
- As políticas garantem que usuários vejam apenas seus dados
- Apenas anúncios aprovados são visíveis publicamente
- O sistema verifica automaticamente o limite de anúncios por plano

## 🔧 Comandos Úteis:

### Verificar se RLS está ativo:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Verificar políticas criadas:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Verificar dados dos planos:
```sql
SELECT * FROM plans WHERE is_active = true;
``` 