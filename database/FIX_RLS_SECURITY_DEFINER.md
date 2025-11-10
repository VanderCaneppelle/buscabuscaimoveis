# 🔒 Correção RLS + SECURITY DEFINER

## 📋 Problema Identificado

As funções RPC (`get_user_active_plan`, `count_user_active_ads`, etc.) estavam retornando dados vazios mesmo quando os registros existiam no banco de dados.

### 🔍 Causa Raiz

As funções RPC **NÃO** tinham o atributo `SECURITY DEFINER`, o que significa que elas executavam com as permissões do usuário que as chamava. Com o RLS (Row Level Security) habilitado na tabela `user_subscriptions`, as políticas bloqueavam o acesso aos dados quando chamadas através das funções RPC.

### 📊 Evidências

**Com RLS desabilitado:**
```
✅ RPC retornou data: [{"plan_name": "free", "max_ads": 1, ...}]
```

**Com RLS habilitado (ANTES da correção):**
```
❌ RPC retornou data: []
```

**Com RLS habilitado (DEPOIS da correção):**
```
✅ RPC retornou data: [{"plan_name": "free", "max_ads": 1, ...}]
```

## ✅ Solução

Adicionar `SECURITY DEFINER` às funções RPC para que elas executem com privilégios elevados, ignorando as políticas RLS:

```sql
CREATE OR REPLACE FUNCTION get_user_active_plan(user_uuid UUID)
RETURNS TABLE (...)
AS $$
BEGIN
    ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ Adiciona privilégios elevados
```

## 🚀 Como Aplicar a Correção

### Opção 1: Script Rápido (Recomendado)
Execute o script de correção no SQL Editor do Supabase:

```bash
database/fix_rpc_security_definer.sql
```

Este script:
1. ✅ Adiciona `SECURITY DEFINER` a todas as funções RPC
2. ✅ Verifica se a correção foi aplicada corretamente

### Opção 2: Reexecutar Script Completo
Se preferir, pode reexecutar o script completo atualizado:

```bash
database/user_plans_system.sql
```

Agora ele já inclui `SECURITY DEFINER` em todas as funções.

## 🔎 Verificação

Após executar a correção, verifique se as funções foram atualizadas:

```sql
SELECT 
    routine_name as function_name,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_user_active_plan',
    'count_user_active_ads',
    'can_user_create_ad',
    'assign_free_plan_to_user',
    'subscribe_user_to_plan'
)
ORDER BY routine_name;
```

**Resultado esperado:**
Todas as funções devem mostrar `security_type = 'DEFINER'`

## 📝 Funções Corrigidas

1. ✅ `get_user_active_plan` - Retorna plano ativo do usuário
2. ✅ `count_user_active_ads` - Conta anúncios ativos
3. ✅ `can_user_create_ad` - Verifica se pode criar anúncio
4. ✅ `assign_free_plan_to_user` - Associa plano gratuito
5. ✅ `subscribe_user_to_plan` - Contrata/altera plano

## 🎯 Teste da Correção

Teste no app:
1. Acesse `PropertyDetailsScreen` com um usuário que tem plano FREE
2. Verifique os logs:
   - ✅ `RPC retornou data[0]: {"plan_name": "free", ...}`
   - ✅ Não deve mais aparecer "Nenhuma assinatura encontrada"

## 📚 Referências

- [Supabase Security Definer Functions](https://supabase.com/docs/guides/database/functions#security-definer-functions)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Function Security](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

## ⚠️ Importante

`SECURITY DEFINER` faz a função executar com privilégios do proprietário (superusuário), ignorando RLS. Use com cuidado e apenas em funções confiáveis que fazem validações adequadas.

No nosso caso, é seguro porque:
- ✅ As funções só retornam dados do próprio usuário
- ✅ Não permitem acesso a dados de outros usuários
- ✅ Fazem validações antes de inserir/atualizar dados

