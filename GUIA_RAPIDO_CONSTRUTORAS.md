# 🚀 Guia Rápido - Sistema de Construtoras

## ✅ O que foi implementado

### 1. **Banco de Dados**

- ✅ Tabela `developers` criada com estrutura completa
- ✅ Coluna `developer_id` adicionada na tabela `properties`
- ✅ Políticas RLS configuradas
- ✅ Índices para performance
- ✅ Triggers para atualização automática

### 2. **Backend/Serviços**

- ✅ `DeveloperService` completo com cache
- ✅ Métodos para buscar, criar, atualizar construtoras
- ✅ Filtros por nome, cidade, estado
- ✅ Cache de 5 minutos para otimização

### 3. **Frontend/UI**

- ✅ Dropdown de construtoras no `CreateAdScreen`
- ✅ Campo de busca em tempo real
- ✅ Seleção com indicador visual
- ✅ Botão para limpar seleção
- ✅ Estados de loading e empty

### 4. **Scripts**

- ✅ Script SQL para criar estrutura
- ✅ Script JS para importar dados do JSON

## 📝 Como Usar - Passo a Passo

### PASSO 1: Criar a Tabela no Supabase

1. Abra o **SQL Editor** do Supabase
2. Copie e cole o conteúdo de `database/create_developers_table.sql`
3. Execute (Run)
4. Aguarde a confirmação

**Verificar:**

```sql
SELECT * FROM developers LIMIT 1;
```

### PASSO 2: Importar os Dados

#### Opção A - Variáveis de Ambiente (Recomendado)

```bash
# No terminal
export SUPABASE_URL="https://seu-projeto.supabase.co"
export SUPABASE_SERVICE_KEY="sua-service-key-aqui"

cd database
node insert_developers_from_json.js
```

#### Opção B - Editar o Arquivo

1. Abra `database/insert_developers_from_json.js`
2. Substitua nas linhas 11-12:

```javascript
const SUPABASE_URL = "https://seu-projeto.supabase.co";
const SUPABASE_SERVICE_KEY = "sua-service-key-aqui";
```

3. Execute:

```bash
cd database
node insert_developers_from_json.js
```

**Resultado Esperado:**

```
📂 Lendo arquivo: construtoras_extraidas.json
✅ 729 construtoras encontradas no arquivo
🔄 Processando lote 1/8 (100 registros)...
   ✅ Inseridos: 100
...
✨ Importação concluída!
💾 Total de construtoras no banco: 729
```

### PASSO 3: Testar no App

1. Abra o app
2. Vá para **"Criar Anúncio"**
3. Preencha os campos básicos
4. Role até **"Construtora (Opcional)"**
5. Toque para abrir o dropdown
6. Use a busca: digite "A10" por exemplo
7. Selecione uma construtora
8. Complete e envie o anúncio

## 🎯 Recursos Principais

### Dropdown com Busca

```
┌─────────────────────────────────┐
│  Selecione a construtora        │
├─────────────────────────────────┤
│  🔍 Buscar construtora...       │
├─────────────────────────────────┤
│  A10 Empreendimentos            │
│  Bal. Camboriú/SC              │
├─────────────────────────────────┤
│  A2D Construtora               │
│  Bal. Camboriú/SC              │
├─────────────────────────────────┤
│  ...                            │
└─────────────────────────────────┘
```

### Busca Inteligente

- Busca por nome da construtora
- Busca por cidade
- Atualização em tempo real
- Sem necessidade de pressionar "enter"

### Cache Automático

- Construtoras carregadas uma vez
- Mantidas em memória por 5 minutos
- Recarregamento automático após expiração
- Melhora significativa na performance

## 🔍 Consultas Úteis

### Ver construtoras importadas

```sql
SELECT 
    full_name,
    city_name,
    city_uf,
    is_active
FROM developers
WHERE is_active = true
ORDER BY full_name
LIMIT 20;
```

### Contar por estado

```sql
SELECT 
    city_uf,
    COUNT(*) as total
FROM developers
WHERE is_active = true
GROUP BY city_uf
ORDER BY total DESC;
```

### Ver imóveis com construtora

```sql
SELECT 
    p.title,
    p.city,
    d.full_name as construtora
FROM properties p
INNER JOIN developers d ON p.developer_id = d.id
WHERE p.status = 'approved';
```

## 🛠️ Adicionando Construtora Manualmente

Via SQL:

```sql
INSERT INTO developers (
    name, 
    name_composition, 
    city_name, 
    city_uf,
    is_active
) VALUES (
    'Nova Construtora',
    'Empreendimentos',
    'São Paulo',
    'SP',
    true
);
```

Via App (futuro):

- Será possível cadastrar via interface
- Upload de logo
- Informações de contato
- Aguardando verificação do admin

## ❓ FAQ

### Posso deixar o campo vazio?

✅ Sim, o campo é **opcional**

### Como editar uma construtora já selecionada?

Toque no botão **"Limpar seleção"** e escolha outra

### As construtoras aparecem em ordem alfabética?

✅ Sim, ordenadas por nome completo

### Quantas construtoras foram importadas?

729 construtoras do arquivo JSON

### Posso adicionar mais construtoras depois?

✅ Sim, via SQL ou futuramente via interface

### A busca funciona com acentos?

✅ Sim, busca case-insensitive

## 📊 Estrutura de Dados

### Tabela developers

```
id                  → UUID único
name                → "A10"
name_composition    → "Empreendimentos"
full_name          → "A10 Empreendimentos" (gerado)
city_name          → "Bal. Camboriú"
city_uf            → "SC"
email              → null (para cadastro futuro)
phone              → null (para cadastro futuro)
website            → null (para cadastro futuro)
logo_url           → null (para cadastro futuro)
is_verified        → false
is_active          → true
created_at         → timestamp
updated_at         → timestamp
```

### Tabela properties (nova coluna)

```
developer_id → UUID (referência para developers.id)
```

## 🔮 Próximos Passos (Futuro)

1. **Cadastro de Construtoras**
   - Interface para usuários cadastrarem
   - Upload de logo e imagens
   - Formulário com todos os campos

2. **Verificação**
   - Sistema de aprovação pelo admin
   - Badge de "verificado"

3. **Perfil Público**
   - Página dedicada da construtora
   - Listagem de todos os imóveis
   - Informações de contato

4. **Filtros Avançados**
   - Filtrar imóveis por construtora
   - Ver todas as construtoras de uma região

## 📞 Suporte

Algum problema? Verifique:

1. ✅ Tabela `developers` criada?
2. ✅ Dados importados com sucesso?
3. ✅ RLS habilitado?
4. ✅ Políticas criadas corretamente?
5. ✅ App reiniciado após mudanças?

---

**Status:** ✅ Completo e Funcional **Versão:** 1.0.0 **Data:** Outubro 2025
