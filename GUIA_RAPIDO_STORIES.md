# 🚀 Guia Rápido - Automação de Stories

## ⚡ Como Começar (5 minutos)

### 1️⃣ Configurar Secrets no GitHub

**Local**: `Seu Repositório` → `Settings` → `Secrets and variables` → `Actions`

Clique em **"New repository secret"** e adicione cada uma:

```
Nome: SUPABASE_URL
Valor: https://[seu-projeto].supabase.co

Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: eyJ... (sua chave service_role)

Nome: CLOUDINARY_CLOUD_NAME
Valor: [seu-cloud-name]

Nome: CLOUDINARY_API_KEY
Valor: [sua-api-key]

Nome: CLOUDINARY_API_SECRET
Valor: [seu-api-secret]
```

⚠️ **Importante**: Sem essas secrets, os workflows **NÃO** funcionarão!

---

### 2️⃣ Fazer Commit e Push

```bash
git add .
git commit -m "feat: adicionar automação de stories com exclusão após 48h"
git push origin remove-stories-after-48h
```

---

### 3️⃣ Testar Localmente (Opcional mas Recomendado)

```bash
cd backend

# Criar arquivo .env se ainda não existe
# Adicionar as variáveis necessárias

# Testar inativação
node scripts/inactivate-old-stories.js

# Testar exclusão
node scripts/delete-old-stories.js
```

---

### 4️⃣ Executar Manualmente no GitHub

1. Acesse: **Actions** na barra superior do GitHub
2. Selecione um workflow:
   - `Inativar Stories Antigos` OU
   - `Excluir Stories Antigos`
3. Clique em **"Run workflow"**
4. Escolha a branch: `remove-stories-after-48h`
5. Clique em **"Run workflow"** (botão verde)
6. Aguarde ~30 segundos
7. Clique no workflow executado para ver os logs

---

### 5️⃣ Verificar Resultado

#### ✅ Sucesso se você ver:

```
✅ [X] stories inativados com sucesso
✅ Execução finalizada: success: true
```

#### ❌ Erro se você ver:

```
❌ Erro ao conectar com Supabase
❌ Credenciais inválidas
```

**Solução**: Verifique as secrets no passo 1

---

## 📅 Agendamento Automático

Uma vez configurado, os jobs rodarão **automaticamente** todos os dias:

| Horário (BRT) | Ação                       | Script                      |
| ------------- | -------------------------- | --------------------------- |
| **00:30**     | Inativar stories com + 24h | `inactivate-old-stories.js` |
| **12:15**     | Excluir stories com + 48h  | `delete-old-stories.js`     |

---

## 🧪 Testar se Está Funcionando

### Criar Story de Teste (via App)

1. Como admin, crie um story
2. Ajuste manualmente o `created_at` no Supabase para **ontem**:
   ```sql
   UPDATE stories 
   SET created_at = NOW() - INTERVAL '25 hours'
   WHERE id = 'seu-story-id';
   ```
3. Execute o workflow de inativação manualmente
4. Verifique se o story foi marcado como `inactive`
5. Ajuste o `created_at` para **2 dias atrás**:
   ```sql
   UPDATE stories 
   SET created_at = NOW() - INTERVAL '49 hours'
   WHERE id = 'seu-story-id';
   ```
6. Execute o workflow de exclusão manualmente
7. Verifique se o story foi excluído do banco

---

## 📊 Ver Logs de Execução

### No GitHub Actions:

1. Acesse: **Actions**
2. Clique no workflow desejado
3. Clique em uma execução específica
4. Veja os logs detalhados

### Exemplo de Log de Sucesso:

```
🚀 Iniciando loadStories...
📅 Cutoff date: 2025-10-12T00:30:00.000Z
🔍 Buscando stories ativos criados há mais de 24 horas...
📊 Total de stories encontrados: 3

📋 Stories a serem inativados:
1. Story abc123:
   - Título: Lançamento Novo
   - Criado em: 11/10/2025 23:00:00
   - Idade: 25h (1 dias)

⏳ Inativando stories...
   ✅ Story abc123 inativado

📊 Resumo da inativação:
   - Stories processados: 3
   - Inativados com sucesso: 3
   - Erros: 0

🎯 Execução finalizada: { success: true, inactivated: 3 }
```

---

## 🔧 Comandos Úteis

### Verificar Stories no Banco

```sql
-- Ver todos os stories ativos
SELECT id, title, status, created_at, 
       EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as idade_horas
FROM stories 
WHERE status = 'active'
ORDER BY created_at DESC;

-- Ver stories que serão inativados em breve
SELECT id, title, created_at
FROM stories 
WHERE status = 'active' 
  AND created_at < NOW() - INTERVAL '24 hours';

-- Ver stories que serão excluídos em breve
SELECT id, title, created_at
FROM stories 
WHERE status = 'inactive' 
  AND created_at < NOW() - INTERVAL '48 hours';
```

---

## ❓ FAQ

### Posso mudar os horários?

✅ Sim! Edite os arquivos `.github/workflows/*.yml`:

```yaml
schedule:
    # Mudar para 02:00 BRT (05:00 UTC)
    - cron: "0 5 * * *"
```

### Posso mudar o tempo de 24h/48h?

✅ Sim! Edite os scripts em `backend/scripts/`:

```javascript
// Para 12 horas:
const cutoffDate = new Date(Date.now() - 12 * 60 * 60 * 1000);

// Para 7 dias:
const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
```

### O que acontece se um job falhar?

- ✅ Não afeta o app
- ✅ Tentará novamente no dia seguinte
- ✅ Você pode executar manualmente
- ✅ Logs detalhados mostram o erro

### Posso desabilitar temporariamente?

✅ Sim! Duas opções:

**Opção 1**: Desabilitar no GitHub

1. `Actions` → Workflow → `...` (três pontos) → `Disable workflow`

**Opção 2**: Comentar o schedule no arquivo `.yml`

```yaml
# on:
#   schedule:
#     - cron: '30 3 * * *'
```

---

## 🎯 Checklist Rápido

- [ ] ✅ Secrets configuradas no GitHub
- [ ] ✅ Commit + Push realizado
- [ ] ✅ Workflow executado manualmente (teste)
- [ ] ✅ Logs verificados (sem erros)
- [ ] ✅ Story de teste criado e processado
- [ ] ✅ Aguardar execução automática (00:30 e 12:15)

---

## 🆘 Problemas Comuns

### "Error: Invalid Supabase credentials"

➡️ Verifique `SUPABASE_SERVICE_ROLE_KEY` nas secrets

### "Error: Cloudinary authentication failed"

➡️ Verifique `CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET`

### "No stories found to process"

➡️ Normal! Significa que não há stories com mais de 24h/48h

### Workflow não aparece no Actions

➡️ Faça push dos arquivos `.github/workflows/*.yml`

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- 📖 **`docs/STORIES_AUTOMATION.md`** - Documentação completa
- 📋 **`STORIES_AUTOMATION_RESUMO.md`** - Resumo executivo

---

## ✨ Pronto!

Sua automação está configurada e rodando! 🎉

Os stories agora serão:

- 🕐 Inativados automaticamente após 24h
- 🗑️ Excluídos automaticamente após 48h

**Próxima verificação**: Amanhã às 00:30 e 12:15! ⏰
