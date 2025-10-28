# 🏢 Sistema de Construtoras - Guia Completo

## 📋 Resumo

Este sistema permite associar construtoras/incorporadoras aos imóveis
cadastrados. Futuramente, haverá um cadastro próprio onde usuários poderão
adicionar e gerenciar suas construtoras.

## 🗂️ Estrutura Criada

### 1. Banco de Dados

#### Tabela `developers`

```sql
- id (UUID) - Identificador único
- name (TEXT) - Nome principal (ex: "A10")
- name_composition (TEXT) - Complemento (ex: "Empreendimentos")
- full_name (GENERATED) - Nome completo gerado automaticamente
- city_name (TEXT) - Cidade onde atua
- city_uf (TEXT) - Estado (UF)
- email, phone, website - Contatos (para cadastro futuro)
- logo_url, cover_image_url - Imagens
- description (TEXT) - Descrição
- cnpj (TEXT) - CNPJ
- user_id (UUID) - Usuário responsável (para cadastro futuro)
- is_verified (BOOLEAN) - Verificada pela administração
- is_active (BOOLEAN) - Ativa/Inativa
- created_at, updated_at - Timestamps
```

#### Alteração na tabela `properties`

- Nova coluna: `developer_id` (UUID) - Referência para a construtora

### 2. Arquivos Criados

```
database/
├── create_developers_table.sql    # Script SQL para criar tabela
├── insert_developers_from_json.js # Script para importar dados
└── CONSTRUTORAS_README.md         # Este arquivo

lib/
└── developerService.js            # Serviço para gerenciar construtoras

components/
└── CreateAdScreen.js              # Atualizado com dropdown de construtoras
```

## 🚀 Como Implementar

### Passo 1: Criar a Tabela no Banco

1. Acesse o **SQL Editor** do Supabase
2. Execute o arquivo `database/create_developers_table.sql`
3. Verifique se a tabela foi criada:

```sql
SELECT * FROM developers LIMIT 5;
```

### Passo 2: Importar Dados das Construtoras

1. Configure as credenciais do Supabase:

```bash
# Via variáveis de ambiente (recomendado)
export SUPABASE_URL="sua-url-aqui"
export SUPABASE_SERVICE_KEY="sua-service-key-aqui"
```

Ou edite o arquivo `database/insert_developers_from_json.js` diretamente.

2. Execute o script de importação:

```bash
cd database
node insert_developers_from_json.js
```

3. Verifique a importação:

```sql
SELECT COUNT(*) as total FROM developers;
SELECT * FROM developers WHERE city_uf = 'SC' LIMIT 10;
```

### Passo 3: Testar no App

1. Abra o app e vá para "Criar Anúncio"
2. Role até o campo "Construtora (Opcional)"
3. Toque para abrir o dropdown
4. Use a busca para encontrar uma construtora
5. Selecione e complete o cadastro do imóvel

## 📊 Funcionalidades Implementadas

### ✅ Seleção de Construtora no Cadastro

- Dropdown com busca
- Lista de todas as construtoras ativas
- Busca por nome ou cidade
- Campo opcional (não obrigatório)
- Possibilidade de limpar seleção

### ✅ Cache Inteligente

- Construtoras são carregadas uma vez e mantidas em cache por 5 minutos
- Melhora performance do dropdown
- Atualização automática quando necessário

### ✅ Políticas RLS (Row Level Security)

- Todos podem visualizar construtoras ativas
- Apenas admins podem inserir/deletar
- Usuários podem atualizar suas próprias construtoras (preparado para cadastro
  futuro)

## 🔮 Funcionalidades Futuras

### Cadastro de Construtoras

No futuro, será possível:

- Usuários cadastrarem suas construtoras
- Upload de logo e imagens
- Verificação pela administração
- Perfil público da construtora
- Listagem de imóveis por construtora

### Campos Preparados para o Futuro

```javascript
{
  email: "contato@construtora.com",
  phone: "(11) 99999-9999",
  website: "https://construtora.com.br",
  logo_url: "url-da-logo",
  cover_image_url: "url-da-capa",
  description: "Descrição completa...",
  cnpj: "00.000.000/0000-00",
  user_id: "uuid-do-usuario",
  is_verified: true // Após verificação do admin
}
```

## 🔍 Consultas Úteis

### Listar construtoras por estado

```sql
SELECT city_uf, COUNT(*) as total 
FROM developers 
WHERE is_active = true 
GROUP BY city_uf 
ORDER BY total DESC;
```

### Buscar construtoras de uma cidade específica

```sql
SELECT * FROM developers 
WHERE city_name = 'Bal. Camboriú' 
AND city_uf = 'SC' 
AND is_active = true;
```

### Ver imóveis com construtora associada

```sql
SELECT 
    p.title,
    p.city,
    d.full_name as construtora,
    d.city_name as cidade_construtora
FROM properties p
LEFT JOIN developers d ON p.developer_id = d.id
WHERE p.status = 'approved'
AND d.id IS NOT NULL;
```

### Construtoras mais usadas

```sql
SELECT 
    d.full_name,
    d.city_name,
    d.city_uf,
    COUNT(p.id) as total_imoveis
FROM developers d
LEFT JOIN properties p ON p.developer_id = d.id
WHERE d.is_active = true
GROUP BY d.id, d.full_name, d.city_name, d.city_uf
ORDER BY total_imoveis DESC
LIMIT 10;
```

## 🛠️ Manutenção

### Adicionar Nova Construtora Manualmente

```sql
INSERT INTO developers (name, name_composition, city_name, city_uf, is_active)
VALUES ('Nome', 'Construtora', 'São Paulo', 'SP', true);
```

### Desativar Construtora

```sql
UPDATE developers 
SET is_active = false 
WHERE id = 'uuid-aqui';
```

### Atualizar Informações

```sql
UPDATE developers 
SET 
    email = 'novo@email.com',
    phone = '(11) 99999-9999',
    website = 'https://novo-site.com'
WHERE id = 'uuid-aqui';
```

### Limpar Cache no App

```javascript
// No código
import { DeveloperService } from "../lib/developerService";
DeveloperService.clearCache();
```

## 📞 API do Serviço

### Métodos Disponíveis

```javascript
import { DeveloperService } from "../lib/developerService";

// Buscar todas as construtoras
const developers = await DeveloperService.getDevelopers({
    search: "termo", // Opcional
    cityUf: "SC", // Opcional
    cityName: "Florianópolis", // Opcional
});

// Buscar por ID
const developer = await DeveloperService.getDeveloperById(id);

// Buscar com cache
const cached = await DeveloperService.getDevelopersWithCache();

// Buscar agrupadas por estado
const byState = await DeveloperService.getDevelopersByState();

// Buscar estados disponíveis
const states = await DeveloperService.getAvailableStates();

// Buscar cidades por estado
const cities = await DeveloperService.getCitiesByState("SC");

// Criar nova construtora (admin/futuro)
const newDev = await DeveloperService.createDeveloper({
    name: "Construtora",
    name_composition: "Ltda",
    city_name: "São Paulo",
    city_uf: "SP",
});

// Atualizar construtora
await DeveloperService.updateDeveloper(id, { phone: "..." });

// Desativar construtora
await DeveloperService.deactivateDeveloper(id);

// Limpar cache
DeveloperService.clearCache();
```

## 🎨 Componentes UI

### CreateAdScreen - Dropdown de Construtora

Características:

- Modal responsivo com busca
- Filtragem em tempo real
- Exibe nome completo e localização
- Indicador visual de seleção
- Botão para limpar seleção
- Loading state
- Empty state customizado

## ⚠️ Troubleshooting

### Construtoras não aparecem no dropdown

1. Verifique se os dados foram importados:

```sql
SELECT COUNT(*) FROM developers WHERE is_active = true;
```

2. Verifique as políticas RLS:

```sql
SELECT * FROM pg_policies WHERE tablename = 'developers';
```

3. Verifique o console do app para erros

### Erro ao importar dados

- Verifique as credenciais do Supabase
- Certifique-se de que a tabela foi criada
- Verifique se o arquivo `construtoras_extraidas.json` existe

### Campo developer_id não salva

- Verifique se a coluna foi adicionada na tabela `properties`
- Verifique se `formData.developer_id` está sendo enviado no `handleSubmit`

## 📝 Notas Importantes

1. **RLS está ativo**: Certifique-se de que as políticas estão corretas
2. **Campo opcional**: O campo de construtora não é obrigatório
3. **Cache de 5 minutos**: Construtoras são cacheadas para melhor performance
4. **Preparado para o futuro**: A estrutura já está pronta para cadastro de
   construtoras

## 🤝 Contribuindo

Para adicionar novas funcionalidades:

1. Atualize a tabela `developers` se necessário
2. Adicione métodos no `DeveloperService`
3. Atualize a UI conforme necessário
4. Documente as mudanças aqui

---

**Última atualização:** Outubro 2025 **Versão:** 1.0.0
