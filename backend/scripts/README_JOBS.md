# Sistema de Gerenciamento Automático de Planos e Anúncios

Este documento descreve o fluxo completo de 3 jobs automatizados que gerenciam planos vencidos e anúncios inativos.

## 📋 Visão Geral

O sistema é composto por 3 jobs que executam em sequência diariamente:

1. **Job 1 - Marcar Planos Vencidos** (00:00 BRT / 03:00 UTC)
2. **Job 2 - Inativar Anúncios** (03:00 BRT / 06:00 UTC)
3. **Job 3 - Excluir Anúncios Inativos** (04:00 BRT / 07:00 UTC)

---

## 🕐 Job 1: Marcar Planos Vencidos

**Arquivo:** `backend/scripts/mark-expired-plans.js`  
**Workflow:** `.github/workflows/mark-expired-plans.yml`  
**Horário:** Diariamente às 00:00 (meia-noite) - Horário de Brasília

### Responsabilidade
Marca assinaturas de usuários como `expired` quando a data de vencimento (`end_date`) é igual ou anterior à data atual.

### Processo
1. Busca todas as assinaturas com `status = 'active'`
2. Compara a data de vencimento com a data atual (apenas dia/mês/ano)
3. Marca como `expired` as assinaturas vencidas
4. Atualiza o campo `updated_at`

### Query Principal
```sql
SELECT * FROM user_subscriptions
WHERE status = 'active'
AND end_date <= CURRENT_DATE
```

### Exemplo de Log
```
🕐 Iniciando marcação de planos vencidos...
📅 Data atual: 2025-10-09
📊 Total de assinaturas ativas encontradas: 5
✅ Assinatura marcada como 'expired': user_id_123 (Plano Bronze)
📊 Resumo: 2 assinaturas marcadas como expired
```

---

## 🕒 Job 2: Inativar Anúncios de Planos Vencidos

**Arquivo:** `backend/scripts/check-expired-plans.js`  
**Workflow:** `.github/workflows/check-expired-plans.yml`  
**Horário:** Diariamente às 03:00 - Horário de Brasília

### Responsabilidade
Inativa todos os anúncios ativos (`ad_status = 'active'`) de usuários cujos planos foram marcados como `expired` pelo Job 1.

### Pré-requisito
- Job 1 deve ter executado com sucesso à meia-noite

### Processo
1. Busca todas as assinaturas com `status = 'expired'`
2. Para cada usuário, busca anúncios com `ad_status = 'active'`
3. Atualiza `ad_status` para `'inactive'`
4. Atualiza o campo `updated_at` dos anúncios

### Query Principal
```sql
-- Buscar usuários com planos expired
SELECT user_id FROM user_subscriptions
WHERE status = 'expired'

-- Para cada usuário, inativar anúncios
UPDATE properties
SET ad_status = 'inactive', updated_at = NOW()
WHERE user_id = ? AND ad_status = 'active'
```

### Exemplo de Log
```
🕒 Iniciando inativação de anúncios de planos vencidos...
📊 Total de assinaturas marcadas como 'expired' encontradas: 2
🔄 Processando usuário user_id_123 (plano: Bronze)
✅ Usuário user_id_123: 3 anúncios inativados
📊 Resumo: 2 usuários processados, 5 anúncios inativados
```

---

## 🕓 Job 3: Excluir Anúncios Inativos

**Arquivo:** `backend/scripts/delete-inactive-ads.js`  
**Workflow:** `.github/workflows/delete-inactive-ads.yml`  
**Horário:** Diariamente às 04:00 - Horário de Brasília

### Responsabilidade
Exclui permanentemente anúncios inativos de usuários sem plano ativo há mais de 3 dias.

### Pré-requisitos
- Job 1 deve ter executado à meia-noite
- Job 2 deve ter executado às 3h da manhã

### Processo
1. Busca usuários com `status IN ('cancelled', 'expired')`
2. Para cada usuário, busca anúncios com:
   - `ad_status = 'inactive'`
   - `updated_at < (data_atual - 3 dias)`
3. Exclui os anúncios encontrados
4. Remove também as mídias associadas (via cascade no banco)

### Query Principal
```sql
-- Buscar usuários sem plano ativo
SELECT DISTINCT user_id FROM user_subscriptions
WHERE status IN ('cancelled', 'expired')

-- Para cada usuário, buscar anúncios inativos há mais de 3 dias
SELECT * FROM properties
WHERE user_id = ?
AND ad_status = 'inactive'
AND updated_at < (NOW() - INTERVAL '3 days')

-- Excluir anúncios
DELETE FROM properties WHERE id = ?
```

### Exemplo de Log
```
🗑️ Iniciando exclusão de anúncios inativos...
📅 Data atual: 2025-10-09T04:00:00.000Z
📅 Data limite (3 dias atrás): 2025-10-06T04:00:00.000Z
👥 Total de usuários sem plano ativo encontrados: 3
🔍 Processando usuário user_id_123...
📋 Usuário user_id_123: 2 anúncio(s) inativo(s) há mais de 3 dias
   🗑️ Excluindo anúncio BB123456 (Casa em São Paulo) - Inativo há 5 dias
   ✅ Anúncio BB123456 excluído com sucesso
✅ Usuário user_id_123: 2 anúncio(s) excluído(s)
📊 Resumo: 3 usuários processados, 4 anúncios excluídos
```

---

## 🔄 Fluxo Completo (Timeline)

### Dia 1 - Plano Vence
- **00:00** - Job 1 marca o plano como `expired`
- **03:00** - Job 2 inativa os anúncios do usuário (`ad_status = 'inactive'`)
- **04:00** - Job 3 não faz nada (anúncios foram inativados há menos de 3 dias)

### Dia 2
- **00:00** - Job 1 não faz nada (plano já está `expired`)
- **03:00** - Job 2 não faz nada (anúncios já estão `inactive`)
- **04:00** - Job 3 não faz nada (anúncios inativos há 1 dia)

### Dia 3
- **00:00** - Job 1 não faz nada
- **03:00** - Job 2 não faz nada
- **04:00** - Job 3 não faz nada (anúncios inativos há 2 dias)

### Dia 4
- **00:00** - Job 1 não faz nada
- **03:00** - Job 2 não faz nada
- **04:00** - **Job 3 EXCLUI os anúncios** (inativos há 3 dias completos)

---

## 🎯 Casos de Uso

### Caso 1: Usuário com plano vencido hoje
```
Dia 1 - 00:00: Plano marcado como 'expired'
Dia 1 - 03:00: Anúncios inativados
Dia 4 - 04:00: Anúncios excluídos (após 3 dias inativos)
```

### Caso 2: Usuário cancela o plano manualmente
```
Momento do cancelamento: status = 'cancelled'
Próximo Job 2 (03:00): Anúncios inativados
3 dias depois (04:00): Anúncios excluídos
```

### Caso 3: Usuário renova o plano antes de 3 dias
```
Dia 1 - 00:00: Plano marcado como 'expired'
Dia 1 - 03:00: Anúncios inativados
Dia 2 - 10:00: Usuário renova o plano (status = 'active')
Dia 2 - 10:01: Usuário reativa seus anúncios manualmente
Dia 4 - 04:00: Job 3 não exclui (anúncios estão ativos novamente)
```

---

## 🛠️ Execução Manual

Todos os jobs podem ser executados manualmente via GitHub Actions:

1. Acesse o repositório no GitHub
2. Vá em **Actions**
3. Selecione o workflow desejado:
   - "Marcar Planos Vencidos"
   - "Inativar Anúncios de Planos Vencidos"
   - "Excluir Anúncios Inativos"
4. Clique em **Run workflow**

### Execução Local (para testes)

```bash
# Job 1
cd backend
node scripts/mark-expired-plans.js

# Job 2
node scripts/check-expired-plans.js

# Job 3
node scripts/delete-inactive-ads.js
```

---

## 📊 Monitoramento

### Logs no GitHub Actions
- Acesse **Actions** no repositório
- Visualize o histórico de execuções
- Cada job gera logs detalhados com:
  - Quantidade de registros processados
  - Sucessos e erros
  - Detalhes por usuário/anúncio

### Verificação no Banco de Dados

```sql
-- Verificar planos vencidos
SELECT * FROM user_subscriptions WHERE status = 'expired';

-- Verificar anúncios inativos
SELECT * FROM properties WHERE ad_status = 'inactive';

-- Verificar anúncios inativos há mais de 3 dias
SELECT * FROM properties 
WHERE ad_status = 'inactive' 
AND updated_at < NOW() - INTERVAL '3 days';
```

---

## ⚠️ Considerações Importantes

1. **Ordem de Execução**: Os jobs devem executar nesta ordem (1 → 2 → 3)
2. **Intervalo de 3h**: Garante que cada job tenha tempo suficiente para executar
3. **Timezone**: Todos os horários são em horário de Brasília (BRT/UTC-3)
4. **Exclusão Permanente**: Job 3 exclui dados permanentemente (não há recuperação)
5. **Cascade**: Ao excluir um anúncio, as mídias associadas também são excluídas
6. **Service Role Key**: Jobs usam `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS

---

## 🔐 Variáveis de Ambiente Necessárias

Configure no GitHub Secrets:

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (não usar anon key)

---

## 📝 Manutenção

### Ajustar período de exclusão (atualmente 3 dias)

Edite `backend/scripts/delete-inactive-ads.js`:

```javascript
// Mudar de 3 para 7 dias, por exemplo
const threeDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
```

### Ajustar horários de execução

Edite os arquivos `.github/workflows/*.yml`:

```yaml
schedule:
  # Formato: minuto hora dia mês dia-da-semana
  # Lembre-se: GitHub Actions usa UTC, não BRT
  - cron: '0 7 * * *'  # 7h UTC = 4h BRT
```

---

## 🆘 Troubleshooting

### Job 1 não marca planos como expired
- Verificar se `end_date` está no formato correto
- Verificar timezone do servidor
- Verificar logs do GitHub Actions

### Job 2 não inativa anúncios
- Verificar se Job 1 executou com sucesso
- Verificar se existem planos com `status = 'expired'`
- Verificar RLS policies da tabela `properties`

### Job 3 não exclui anúncios
- Verificar se passaram 3 dias desde a inativação
- Verificar campo `updated_at` dos anúncios
- Verificar se usuário tem `status IN ('cancelled', 'expired')`

---

## 📚 Referências

- [GitHub Actions Cron Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Supabase Service Role](https://supabase.com/docs/guides/api/api-keys)
- [Timezone Converter](https://www.timeanddate.com/worldclock/converter.html)

