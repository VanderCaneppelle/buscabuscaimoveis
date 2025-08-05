# 🏠 Painel Administrativo - BuscaBusca Imóveis

## 📋 Visão Geral

Este painel administrativo permite que administradores aprovem ou rejeitem anúncios de imóveis antes que sejam publicados no aplicativo móvel.

## 🚀 Como Usar

### 1. Configuração Inicial

1. **Atualizar credenciais do Supabase:**
   - Abra o arquivo `admin.js`
   - Substitua `SUPABASE_URL` e `SUPABASE_ANON_KEY` pelas suas credenciais

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

2. **Executar script SQL:**
   - Execute o arquivo `database/admin_approval_system.sql` no seu banco Supabase
   - Isso criará as colunas e políticas necessárias

3. **Tornar um usuário administrador:**
   ```sql
   UPDATE profiles SET is_admin = true WHERE email = 'admin@exemplo.com';
   ```

### 2. Acessar o Painel

1. Abra o arquivo `index.html` em um navegador web
2. O painel carregará automaticamente todos os anúncios

## 🎯 Funcionalidades

### 📊 Dashboard
- **Estatísticas em tempo real:**
  - Total de anúncios
  - Aguardando aprovação
  - Aprovados
  - Rejeitados

### 🔍 Filtros
- **Por Status:** Pending, Approved, Rejected
- **Por Tipo:** Casa, Apartamento, Terreno, Comercial
- **Por Cidade:** Busca por nome da cidade

### ✅ Aprovação de Anúncios
- **Aprovar:** Anúncio fica visível no app
- **Rejeitar:** Anúncio fica oculto + motivo opcional
- **Ver Detalhes:** Informações completas do anúncio

## 🗄️ Estrutura do Banco

### Tabela `properties` - Novos Campos:
```sql
status VARCHAR(20) DEFAULT 'pending' -- pending, approved, rejected
approved_at TIMESTAMP WITH TIME ZONE
approved_by UUID REFERENCES auth.users(id)
rejected_at TIMESTAMP WITH TIME ZONE
rejected_by UUID REFERENCES auth.users(id)
rejection_reason TEXT
```

### Tabela `profiles` - Novo Campo:
```sql
is_admin BOOLEAN DEFAULT false
```

## 🔐 Segurança

### Políticas RLS (Row Level Security):
- **Usuários normais:** Veem apenas anúncios aprovados
- **Administradores:** Veem todos os anúncios
- **Proprietários:** Veem seus próprios anúncios (qualquer status)

### Funções de Segurança:
- `is_admin()`: Verifica se usuário é administrador
- `get_property_stats()`: Estatísticas apenas para admins

## 📱 Fluxo de Trabalho

### 1. Criação de Anúncio (App Móvel)
```
Usuário cria anúncio → Status: 'pending' → Aguarda aprovação
```

### 2. Aprovação (Painel Web)
```
Admin visualiza → Aprova/Rejeita → Status atualizado → App reflete mudança
```

### 3. Publicação (App Móvel)
```
Apenas anúncios com status: 'approved' aparecem na busca
```

## 🛠️ Desenvolvimento

### Estrutura de Arquivos:
```
admin/
├── index.html          # Interface do painel
├── admin.js           # Lógica JavaScript
└── README.md          # Esta documentação
```

### Tecnologias Utilizadas:
- **HTML5 + CSS3:** Interface responsiva
- **Bootstrap 5:** Framework CSS
- **Font Awesome:** Ícones
- **Supabase JS:** Cliente do banco de dados
- **Vanilla JavaScript:** Lógica da aplicação

## 🔧 Personalização

### Cores e Estilo:
- Edite as classes CSS no arquivo `index.html`
- Modifique as variáveis Bootstrap conforme necessário

### Funcionalidades Adicionais:
- Adicione notificações por email
- Implemente sistema de logs
- Crie relatórios detalhados
- Adicione autenticação específica para admins

## 🚨 Troubleshooting

### Problemas Comuns:

1. **"Erro ao carregar dados"**
   - Verifique as credenciais do Supabase
   - Confirme se o script SQL foi executado

2. **"Acesso negado"**
   - Verifique se o usuário tem `is_admin = true`
   - Confirme as políticas RLS

3. **"Anúncios não aparecem"**
   - Verifique se existem anúncios no banco
   - Confirme se o status está correto

### Logs de Debug:
- Abra o Console do navegador (F12)
- Verifique mensagens de erro
- Confirme conexão com Supabase

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Consulte os logs do console
3. Teste as credenciais do Supabase
4. Confirme a execução do script SQL

---

**Desenvolvido para BuscaBusca Imóveis** 🏠 