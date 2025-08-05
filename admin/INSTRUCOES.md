# 🚀 Instruções de Configuração - Painel Administrativo

## 📋 Passo a Passo para Configurar

### 1. 🗄️ Configurar Banco de Dados

Execute o script SQL no seu Supabase:

```sql
-- Copie e execute o conteúdo do arquivo database/admin_approval_system_fixed.sql
-- no SQL Editor do seu projeto Supabase
```

### 2. 👤 Tornar um Usuário Administrador

No SQL Editor do Supabase, execute:

```sql
UPDATE profiles SET is_admin = true WHERE email = 'seu-email@exemplo.com';
```

### 3. 🔧 Configurar Credenciais (se necessário)

Se precisar alterar as credenciais do Supabase:

1. Abra o arquivo `admin.js`
2. Substitua as linhas 2-3 pelas suas credenciais:

```javascript
const SUPABASE_URL = 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = 'sua-chave-anonima';
```

### 4. 🌐 Acessar o Painel

1. Abra o arquivo `admin/index.html` em um navegador
2. **Faça login** com suas credenciais de administrador
3. O painel carregará automaticamente após autenticação

## 🎯 Como Usar o Painel

### 📊 Dashboard
- Visualize estatísticas em tempo real
- Veja quantos anúncios aguardam aprovação

### 🔍 Filtrar Anúncios
- **Status:** Pending, Approved, Rejected
- **Tipo:** Casa, Apartamento, etc.
- **Cidade:** Busca por nome

### ✅ Aprovar/Rejeitar
1. Clique em **"Aprovar"** para publicar o anúncio
2. Clique em **"Rejeitar"** para recusar (opcional: informe motivo)
3. Clique em **"Ver Detalhes"** para mais informações

## 🔄 Fluxo de Trabalho

### No App Móvel:
1. Usuário cria anúncio
2. Status automaticamente: `pending`
3. Anúncio não aparece na busca

### No Painel Web:
1. Admin visualiza anúncios pendentes
2. Aprova ou rejeita
3. Status atualizado automaticamente

### De Volta ao App:
1. Apenas anúncios `approved` aparecem
2. Usuário vê status do seu anúncio

## 🛠️ Estrutura de Arquivos

```
admin/
├── index.html          # Interface web
├── admin.js           # Lógica JavaScript
├── setup.js           # Script de configuração
├── README.md          # Documentação completa
└── INSTRUCOES.md      # Este arquivo
```

## 🚨 Solução de Problemas

### "Erro ao carregar dados"
- ✅ Verifique conexão com internet
- ✅ Confirme credenciais do Supabase
- ✅ Execute o script SQL

### "Nenhum anúncio aparece"
- ✅ Verifique se existem anúncios no banco
- ✅ Confirme se o usuário é admin
- ✅ Verifique políticas RLS

### "Botões não funcionam"
- ✅ Abra Console (F12) para ver erros
- ✅ Verifique permissões de admin
- ✅ Confirme conexão com Supabase

## 📞 Suporte

Se encontrar problemas:

1. **Verifique o Console** (F12 → Console)
2. **Teste as credenciais** no Supabase
3. **Confirme execução do SQL**
4. **Verifique permissões de admin**

---

**✅ Sistema pronto para uso!** 🎉 