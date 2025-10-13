# 📱 Automação de Stories - Documentação Completa

## 📋 Visão Geral

Sistema de automação para gerenciar o ciclo de vida dos stories:
- **24 horas**: Stories ativos são marcados como inativos
- **48 horas**: Stories inativos são excluídos permanentemente (incluindo mídias)

## 🎯 Objetivo

Manter o banco de dados limpo, excluindo automaticamente stories antigos e suas mídias do Cloudinary/Supabase Storage.

---

## 📁 Arquivos Criados

### 1. Backend Service
**`backend/lib/storyService.js`**
- Serviço backend para manipular stories
- Métodos para inativar e deletar stories
- Exclusão de mídias do Cloudinary e Supabase Storage
- Similar ao `propertyService.js`

**Principais métodos:**
- `getStoriesOlderThan24Hours()` - Busca stories ativos com mais de 24h
- `getInactiveStoriesOlderThan48Hours()` - Busca stories inativos com mais de 48h
- `inactivateStory(storyId)` - Marca story como inativo
- `deleteStory(storyId)` - Exclui story e suas mídias
- `inactivateMultipleStories(storyIds)` - Inativa múltiplos stories
- `deleteMultipleStories(storyIds)` - Exclui múltiplos stories

### 2. Scripts de Automação

#### **`backend/scripts/inactivate-old-stories.js`**
- **Execução**: Diariamente às 00:30 (horário de Brasília)
- **Função**: Inativar stories com mais de 24 horas
- **Critérios**: 
  - Status = 'active'
  - created_at < (agora - 24 horas)

#### **`backend/scripts/delete-old-stories.js`**
- **Execução**: Diariamente às 12:15 (horário de Brasília)
- **Função**: Excluir stories inativos com mais de 48 horas
- **Critérios**: 
  - Status = 'inactive'
  - created_at < (agora - 48 horas)
- **Ações**: 
  - Exclui mídias do Cloudinary
  - Exclui mídias do Supabase Storage
  - Exclui registro do banco de dados

### 3. GitHub Actions Workflows

#### **`.github/workflows/inactivate-old-stories.yml`**
- **Horário**: 00:30 BRT (03:30 UTC)
- **Cron**: `'30 3 * * *'`
- **Script**: `inactivate-old-stories.js`

#### **`.github/workflows/delete-old-stories.yml`**
- **Horário**: 12:15 BRT (15:15 UTC)
- **Cron**: `'15 15 * * *'`
- **Script**: `delete-old-stories.js`

---

## 🔄 Fluxo de Trabalho

```
Story Criado (created_at)
         │
         ├─── 0-24h ──────► Status: ACTIVE
         │                   └─ Visível na UI
         │
         ├─── 24h ───────────► Job 1: Marca como INACTIVE
         │                   └─ (00:30 diariamente)
         │                   └─ Não visível na UI
         │
         └─── 48h ───────────► Job 2: EXCLUI permanentemente
                             └─ (12:15 diariamente)
                             └─ Remove mídias + registro DB
```

---

## 🖥️ Interface do Usuário

### StoriesComponent (já implementado)

O componente `components/StoriesComponent.js` já filtra corretamente:

```javascript
// Linha 67-76
const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const { data: supabaseStories, error } = await supabase
    .from('stories')
    .select('*')
    .eq('status', 'active')                  // ✅ Apenas ativos
    .gte('created_at', cutoffDate)           // ✅ Últimas 24h
    .order('order_index', { ascending: true })
    .limit(10);
```

**✅ Não é necessário alterar a UI** - já está filtrando corretamente!

---

## ⚙️ Variáveis de Ambiente Necessárias

Os workflows do GitHub Actions precisam das seguintes secrets configuradas no repositório:

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

### Como configurar:
1. Acesse: `Settings` → `Secrets and variables` → `Actions`
2. Adicione as secrets necessárias

---

## 🧪 Testes Manuais

### 1. Testar script de inativação localmente:

```bash
cd backend
node scripts/inactivate-old-stories.js
```

### 2. Testar script de exclusão localmente:

```bash
cd backend
node scripts/delete-old-stories.js
```

### 3. Executar workflow manualmente no GitHub:

1. Acesse: `Actions` → Selecione o workflow
2. Clique em `Run workflow`
3. Acompanhe os logs de execução

---

## 📊 Logs e Monitoramento

### Logs dos Scripts

Ambos os scripts produzem logs detalhados:

#### Inativação:
```
⏰ Iniciando inativação de stories antigos...
📅 Data atual: 2025-10-13T03:30:00.000Z
📅 Data limite (24 horas atrás): 2025-10-12T03:30:00.000Z
🔍 Buscando stories ativos criados há mais de 24 horas...
📊 Total de stories encontrados: 3
📋 Stories a serem inativados:
   1. Story abc123:
      - Título: Meu Story
      - Criado em: 12/10/2025 02:00:00
      - Idade: 25h (1 dias)
✅ Story abc123 inativado com sucesso
```

#### Exclusão:
```
🗑️ Iniciando exclusão de stories antigos...
📅 Data atual: 2025-10-14T15:15:00.000Z
📅 Data limite (48 horas atrás): 2025-10-12T15:15:00.000Z
🔍 Buscando stories inativos criados há mais de 48 horas...
📊 Total de stories encontrados: 2
📸 Total de mídias a excluir: 4
   🗑️ Excluindo story xyz789 (Meu Story)...
      - Criado há 50h (2 dias)
      - Mídias: 2
   🗑️ Excluindo do Cloudinary: https://...
   ✅ Arquivo excluído do Cloudinary
   ✅ Story xyz789 excluído com sucesso (incluindo 2 mídia(s))
```

### Monitoramento no GitHub Actions

Acesse: `Actions` → Selecione o workflow → Visualize os logs

---

## 🚨 Tratamento de Erros

### Cenários Tratados:

1. **Erro ao conectar com Supabase**: Script continua e tenta novamente na próxima execução
2. **Erro ao excluir mídia do Cloudinary**: Log de warning, mas continua excluindo do banco
3. **Erro ao excluir mídia do Supabase Storage**: Log de warning, mas continua excluindo do banco
4. **Story não encontrado**: Log de warning e pula para o próximo

### Garantias:

- ✅ Scripts nunca falham completamente
- ✅ Erros individuais não impedem o processamento de outros stories
- ✅ Logs detalhados para debugging
- ✅ Exit codes apropriados (0 = sucesso, 1 = erro)

---

## 🔧 Manutenção

### Ajustar Horários

Para alterar os horários de execução, edite o `cron` nos workflows:

```yaml
# Formato: 'minuto hora * * *'
# Exemplo: às 02:00 BRT (05:00 UTC)
- cron: '0 5 * * *'
```

**Lembre-se**: Converter BRT (UTC-3) para UTC (+3 horas)

### Ajustar Período de Inativação/Exclusão

Edite as funções nos scripts:

```javascript
// Para 48h em vez de 24h:
const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
```

---

## ✅ Checklist de Implementação

- [x] Criar `backend/lib/storyService.js`
- [x] Criar `backend/scripts/inactivate-old-stories.js`
- [x] Criar `backend/scripts/delete-old-stories.js`
- [x] Criar `.github/workflows/inactivate-old-stories.yml`
- [x] Criar `.github/workflows/delete-old-stories.yml`
- [ ] Configurar secrets no GitHub
- [ ] Testar scripts localmente
- [ ] Executar workflows manualmente no GitHub
- [ ] Monitorar logs das primeiras execuções
- [ ] Validar que stories estão sendo inativados/excluídos corretamente

---

## 📝 Notas Importantes

1. **Banco de Dados**: A tabela `stories` deve ter o campo `status` (VARCHAR)
2. **Mídias**: Stories podem ter `image_url` e `thumbnail_url`
3. **Storage**: Mídias podem estar no Cloudinary ou Supabase Storage
4. **UI**: Já está filtrando apenas stories ativos das últimas 24h
5. **Timezone**: Todos os horários consideram o fuso horário de Brasília (UTC-3)

---

## 🐛 Troubleshooting

### Stories não estão sendo inativados

1. Verificar logs do workflow no GitHub Actions
2. Verificar se as secrets estão configuradas corretamente
3. Testar script localmente com `node scripts/inactivate-old-stories.js`
4. Verificar se há stories que atendem aos critérios (status=active, created_at > 24h)

### Stories não estão sendo excluídos

1. Verificar se o job de inativação está rodando (pré-requisito)
2. Verificar logs do workflow no GitHub Actions
3. Verificar credenciais do Cloudinary
4. Testar script localmente

### Mídias não estão sendo excluídas

1. Verificar logs para ver qual storage falhou
2. Verificar credenciais do Cloudinary (API Key, API Secret)
3. Verificar permissões do Supabase (Service Role Key)

---

## 📞 Suporte

Para problemas ou dúvidas, verificar:
1. Logs dos workflows no GitHub Actions
2. Logs do script local (se executado manualmente)
3. Estrutura da tabela `stories` no Supabase

---

**Última atualização**: 13/10/2025
**Versão**: 1.0.0

