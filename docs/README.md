# 📚 Documentação Busca Busca Imóveis

## 📋 Índice da Documentação

### ✅ 1. [Ambientes e Credenciais](./AMBIENTES_E_CREDENCIAIS.md)
- **Configuração** de ambientes QA e Produção
- **Credenciais** do Supabase, Vercel e Admin Panel
- **Detecção automática** de ambiente
- **Deploy** e configuração

### ✅ 2. [Fluxo de Moderação Completo](./FLUXO_MODERACAO_COMPLETO.md)
- **Arquitetura** do sistema de moderação
- **Fluxo de aprovação** passo a passo
- **Fluxo de rejeição** passo a passo
- **Notificações** in-app e push
- **Segurança** e autenticação

### ✅ 3. [Troubleshooting Admin](./TROUBLESHOOTING_ADMIN.md)
- **Problemas comuns** e soluções
- **Debug avançado** com logs
- **Ferramentas** de diagnóstico
- **Checklist** de verificação

---

## 🚀 Início Rápido

### ✅ Para Desenvolvedores

1. **Configurar ambiente:**
   ```bash
   git clone [repository]
   cd buscabuscaimoveis
   npm install
   ```

2. **Configurar variáveis:**
   - Copiar `.env.example` para `.env`
   - Configurar credenciais do Supabase
   - Configurar credenciais do Vercel

3. **Executar localmente:**
   ```bash
   npm start
   ```

### ✅ Para Administradores

1. **Acessar admin panel:**
   - **QA:** [buscabuscaimoveis-admin-qa.vercel.app](https://buscabuscaimoveis-admin-qa.vercel.app)
   - **Produção:** [buscabuscaimoveis-admin-prod.vercel.app](https://buscabuscaimoveis-admin-prod.vercel.app)

2. **Fazer login** com credenciais de admin

3. **Moderar propriedades:**
   - Aprovar/Rejeitar anúncios
   - Ver estatísticas
   - Gerenciar usuários

---

## 🔧 Componentes Principais

### ✅ 1. App Mobile (React Native + Expo)
- **Tecnologia:** React Native, Expo, Supabase
- **Função:** Interface do usuário final
- **Ambientes:** QA e Produção automáticos

### ✅ 2. Backend API (Vercel Functions)
- **Tecnologia:** Node.js, Supabase, Vercel
- **Função:** API segura para admin e app
- **Ambientes:** QA e Produção separados

### ✅ 3. Admin Panel (HTML/JS)
- **Tecnologia:** HTML, JavaScript, Bootstrap
- **Função:** Interface de moderação
- **Ambientes:** QA e Produção separados

### ✅ 4. Banco de Dados (Supabase)
- **Tecnologia:** PostgreSQL, Row Level Security
- **Função:** Armazenamento de dados
- **Ambientes:** QA e Produção separados

---

## 🌍 Ambientes

### ✅ QA (Desenvolvimento)
- **Branch:** `qa`
- **Supabase:** `ftglfnmyxtnygrmkxwos.supabase.co`
- **Vercel:** `buscabuscaimoveis-qa.vercel.app`
- **Admin:** `buscabusca-admin-qa.vercel.app`

### ✅ Produção
- **Branch:** `main`
- **Supabase:** `rxozhlxmfbioqgqomkrz.supabase.co`
- **Vercel:** `buscabusca.vercel.app`
- **Admin:** `buscabusca-admin-prod.vercel.app`

---

## 🔐 Segurança

### ✅ Autenticação
- **App Mobile:** Supabase Auth
- **Admin Panel:** API segura com Bearer Token
- **Backend:** Service Role Key

### ✅ Autorização
- **RLS:** Row Level Security no Supabase
- **Admin:** Verificação de `is_admin` no banco
- **API:** Middleware de autenticação

---

## 📱 Notificações

### ✅ In-App Notifications
- **Tecnologia:** Supabase Realtime
- **Tipos:** Aprovação, Rejeição, Contato WhatsApp
- **Delivery:** Instantâneo via Realtime

### ✅ Push Notifications
- **Tecnologia:** Expo Notifications
- **Delivery:** Via Expo Push Service
- **Configuração:** Automática por ambiente

---

## 🚀 Deploy

### ✅ Deploy Automático
- **QA:** Push para branch `qa`
- **Produção:** Push para branch `main`
- **Vercel:** Deploy automático via Git

### ✅ Configuração
- **Variáveis de ambiente:** Configuradas no Vercel
- **Credenciais:** Separadas por ambiente
- **Detecção:** Automática baseada em branch/hostname

---

## 🔍 Monitoramento

### ✅ Logs
- **App Mobile:** Console do dispositivo
- **Admin Panel:** Console do browser
- **Backend:** Vercel Functions logs
- **Banco:** Supabase logs

### ✅ Health Checks
- **API:** `/api/health` endpoints
- **Admin:** Status da página
- **App:** Status da conexão

---

## 📞 Suporte

### ✅ Documentação
- **Ambientes:** [AMBIENTES_E_CREDENCIAIS.md](./AMBIENTES_E_CREDENCIAIS.md)
- **Moderação:** [FLUXO_MODERACAO_COMPLETO.md](./FLUXO_MODERACAO_COMPLETO.md)
- **Troubleshooting:** [TROUBLESHOOTING_ADMIN.md](./TROUBLESHOOTING_ADMIN.md)

### ✅ Debug
- **Console logs:** Detalhados em todos os componentes
- **Network requests:** Status e headers
- **Backend logs:** Vercel Functions
- **Database logs:** Supabase

---

## 🎯 Status do Sistema

### ✅ Funcionando
- **✅ App Mobile:** Totalmente funcional
- **✅ Admin Panel:** Totalmente funcional
- **✅ Backend API:** Totalmente funcional
- **✅ Notificações:** In-app e push funcionando
- **✅ Moderação:** Aprovação/rejeição funcionando
- **✅ Segurança:** Autenticação e autorização funcionando

### ✅ Ambientes
- **✅ QA:** Configurado e funcionando
- **✅ Produção:** Configurado e funcionando
- **✅ Deploy:** Automático funcionando
- **✅ Credenciais:** Separadas e funcionando

**Sistema totalmente funcional e documentado!** 🚀
