# 🎯 Automação de Stories - Resumo Executivo

## ✅ Implementação Completa

Sistema de automação para gerenciar o ciclo de vida dos stories no app
BuscaBuscaImóveis.

---

## 📂 Arquivos Criados

### Backend

1. **`backend/lib/storyService.js`** (437 linhas)
   - Serviço backend para manipular stories
   - Métodos para inativar e deletar stories
   - Exclusão automática de mídias do Cloudinary e Supabase Storage

2. **`backend/scripts/inactivate-old-stories.js`** (107 linhas)
   - Script para inativar stories com mais de 24h
   - Executa diariamente às 00:30 BRT

3. **`backend/scripts/delete-old-stories.js`** (159 linhas)
   - Script para excluir stories inativos com mais de 48h
   - Executa diariamente às 12:15 BRT
   - Remove mídias + registros do banco

### GitHub Actions

4. **`.github/workflows/inactivate-old-stories.yml`** (51 linhas)
   - Workflow para rodar inativação às 00:30 BRT (03:30 UTC)
   - Cron: `'30 3 * * *'`

5. **`.github/workflows/delete-old-stories.yml`** (51 linhas)
   - Workflow para rodar exclusão às 12:15 BRT (15:15 UTC)
   - Cron: `'15 15 * * *'`

### Documentação

6. **`docs/STORIES_AUTOMATION.md`** (documentação completa)
7. **`STORIES_AUTOMATION_RESUMO.md`** (este arquivo)

---

## 🔄 Fluxo de Automação

```
┌─────────────────────────────────────────────────────────────────┐
│  Story Criado                                                   │
│  status: 'active'                                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  0-24 horas                                                     │
│  • Status: ACTIVE                                               │
│  • Visível na UI                                                │
│  • Usuários podem visualizar                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (00:30 BRT)
┌─────────────────────────────────────────────────────────────────┐
│  Job 1: INATIVAR (inactivate-old-stories.js)                   │
│  • Marca como status: 'inactive'                                │
│  • Não aparece mais na UI                                       │
│  • Dados preservados no banco                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (mais 24h)
┌─────────────────────────────────────────────────────────────────┐
│  24-48 horas                                                    │
│  • Status: INACTIVE                                             │
│  • Não visível na UI                                            │
│  • Aguardando exclusão                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼ (12:15 BRT)
┌─────────────────────────────────────────────────────────────────┐
│  Job 2: EXCLUIR (delete-old-stories.js)                        │
│  • Exclui mídias do Cloudinary                                  │
│  • Exclui mídias do Supabase Storage                            │
│  • Exclui registro do banco de dados                            │
│  • Story completamente removido                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Benefícios

### Limpeza Automática

✅ Stories antigos não acumulam no banco\
✅ Mídias obsoletas são removidas\
✅ Espaço de storage economizado

### Performance

✅ Banco de dados mais leve\
✅ Queries mais rápidas\
✅ Menos dados para buscar

### Manutenção

✅ Totalmente automatizado\
✅ Logs detalhados\
✅ Execução diária garantida

---

## 📋 Próximos Passos

### 1. Configurar Secrets no GitHub

Acesse: `Settings` → `Secrets and variables` → `Actions`

Adicionar:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

### 2. Testar Localmente

```bash
cd backend

# Testar inativação
node scripts/inactivate-old-stories.js

# Testar exclusão
node scripts/delete-old-stories.js
```

### 3. Executar Workflows Manualmente

1. Acesse: `Actions` no GitHub
2. Selecione o workflow desejado
3. Clique em `Run workflow`
4. Monitore os logs

### 4. Monitorar Primeiras Execuções

- Verificar se stories estão sendo inativados às 00:30
- Verificar se stories estão sendo excluídos às 12:15
- Validar logs de execução
- Confirmar que mídias estão sendo removidas

---

## 📊 Estatísticas Esperadas

### Execução Típica - Inativação (00:30)

```
⏰ Iniciando inativação de stories antigos...
📊 Total de stories encontrados: 5
✅ Stories inativados com sucesso: 5
⏱️ Tempo de execução: ~2-5 segundos
```

### Execução Típica - Exclusão (12:15)

```
🗑️ Iniciando exclusão de stories antigos...
📊 Total de stories encontrados: 3
📸 Total de mídias a excluir: 6
✅ Stories excluídos: 3
✅ Mídias excluídas: 6
⏱️ Tempo de execução: ~5-15 segundos
```

---

## ⚠️ Importante

### Interface do Usuário

✅ **Não precisa alterar a UI** - O componente `StoriesComponent.js` já filtra
corretamente:

- Apenas stories com `status = 'active'`
- Criados nas últimas 24 horas

### Banco de Dados

✅ **Não precisa alterar o banco** - A tabela `stories` já tem:

- Campo `status` (VARCHAR)
- Campo `created_at` (TIMESTAMP)

### Mídias

✅ **Exclusão automática de mídias** nos storages:

- Cloudinary (usando SDK direto)
- Supabase Storage (usando API)

---

## 🔒 Segurança

### Secrets Configuradas

- ✅ Credenciais nunca no código
- ✅ Armazenadas como GitHub Secrets
- ✅ Acessíveis apenas nos workflows

### Permissões

- ✅ Service Role Key para Supabase (acesso total)
- ✅ API Key + Secret para Cloudinary
- ✅ Execução apenas via GitHub Actions

---

## 📈 Monitoramento

### Verificar Execução

```bash
# No GitHub
Actions → [Workflow Name] → Ver logs da última execução
```

### Logs Detalhados

- ✅ Data/hora de execução
- ✅ Quantidade de stories processados
- ✅ Sucessos e erros
- ✅ Detalhes de cada story processado
- ✅ Quantidade de mídias excluídas

---

## 🎉 Conclusão

Sistema completamente implementado e pronto para uso!

### Arquivos Backend

✅ `backend/lib/storyService.js`\
✅ `backend/scripts/inactivate-old-stories.js`\
✅ `backend/scripts/delete-old-stories.js`

### GitHub Actions

✅ `.github/workflows/inactivate-old-stories.yml`\
✅ `.github/workflows/delete-old-stories.yml`

### Documentação

✅ `docs/STORIES_AUTOMATION.md` (completa)\
✅ `STORIES_AUTOMATION_RESUMO.md` (este arquivo)

### Próximo Passo Crítico

⚠️ **Configurar secrets no GitHub** (sem isso os workflows não funcionarão)

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte `docs/STORIES_AUTOMATION.md` (documentação completa)
2. Verifique logs no GitHub Actions
3. Execute scripts localmente para debug

---

**Data de Implementação**: 13/10/2025\
**Status**: ✅ Pronto para produção\
**Versão**: 1.0.0
