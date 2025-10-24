# 🔧 Troubleshooting - Admin Panel

## 📋 Problemas Comuns e Soluções

### ✅ 1. Erro de Autenticação

#### **❌ Problema: "Token não encontrado"**
```
❌ PROPERTY-DETAILS - Token não encontrado no localStorage
❌ PROPERTY-DETAILS - Redirecionando para login...
```

**🔧 Solução:**
1. **Verificar login:** Acessar [admin panel](https://buscabuscaimoveis-admin-qa.vercel.app)
2. **Fazer login** com credenciais de admin
3. **Verificar localStorage:** `localStorage.getItem('adminToken')`
4. **Limpar cache** se necessário

#### **❌ Problema: "Invalid token"**
```
401 (Unauthorized)
Error: Invalid token
```

**🔧 Solução:**
1. **Verificar token:** `localStorage.getItem('adminToken')`
2. **Fazer logout e login** novamente
3. **Verificar credenciais** de admin no banco
4. **Verificar RLS** no Supabase

---

### ✅ 2. Erro de Conexão com API

#### **❌ Problema: "Failed to fetch"**
```
TypeError: Failed to fetch
```

**🔧 Solução:**
1. **Verificar URL:** `API_BASE_URL` correto
2. **Verificar CORS:** Headers corretos
3. **Verificar rede:** Conexão com internet
4. **Verificar Vercel:** Deploy funcionando

#### **❌ Problema: "404 Not Found"**
```
404 (Not Found)
```

**🔧 Solução:**
1. **Verificar endpoint:** URL correta
2. **Verificar deploy:** Vercel funcionando
3. **Verificar branch:** `qa` vs `main`
4. **Verificar logs:** Vercel Functions

---

### ✅ 3. Erro de Moderação

#### **❌ Problema: "Propriedade não encontrada"**
```
❌ MODERATION - Propriedade não encontrada na lista
```

**🔧 Solução:**
1. **Verificar ID:** Propriedade existe no banco
2. **Verificar permissões:** Admin tem acesso
3. **Verificar RLS:** Políticas corretas
4. **Verificar logs:** Backend funcionando

#### **❌ Problema: "ModerationService não disponível"**
```
❌ PROPERTY-DETAILS - ModerationService disponível? false
```

**🔧 Solução:**
1. **Verificar script:** `moderationService.js` carregado
2. **Verificar ordem:** Scripts na ordem correta
3. **Verificar console:** Erros de JavaScript
4. **Verificar rede:** CDN funcionando

---

### ✅ 4. Erro de Notificações

#### **❌ Problema: "Notificação não criada"**
```
❌ APPROVE - Erro ao criar notificação in-app
```

**🔧 Solução:**
1. **Verificar banco:** Tabela `in_app_notifications` existe
2. **Verificar RLS:** Políticas corretas
3. **Verificar user_id:** Usuário existe
4. **Verificar logs:** Supabase funcionando

#### **❌ Problema: "Push notification falhou"**
```
❌ APPROVE - Erro ao enviar push notification: 500
```

**🔧 Solução:**
1. **Verificar endpoint:** `/api/notifications` funcionando
2. **Verificar credenciais:** Expo Push Token
3. **Verificar logs:** Vercel Functions
4. **Verificar rede:** Conexão com Expo

---

## 🔍 Debug Avançado

### ✅ 1. Verificar Logs do Console

#### **✅ Logs Esperados (Funcionando):**
```javascript
🔍 PROPERTY-DETAILS - Token carregado: SIM
🔍 PROPERTY-DETAILS - Usuário carregado: SIM
🔍 PROPERTY-DETAILS - Configurando botão de aprovação
🔍 PROPERTY-DETAILS - Botão de aprovação clicado!
🔍 PROPERTY-DETAILS - ModerationService disponível? true
🔍 MODERATION - Iniciando aprovação: [property_id]
🔍 MODERATION - Token encontrado: SIM
🔍 MODERATION - Buscando propriedade para aprovação...
🔍 MODERATION - Resposta da busca: 200
🔍 MODERATION - Dados recebidos: [X] propriedades
🔍 MODERATION - Propriedade encontrada: true
🔍 MODERATION - Chamando API de aprovação...
✅ Anúncio [property_id] aprovado e ativado com sucesso
```

#### **❌ Logs de Erro:**
```javascript
❌ PROPERTY-DETAILS - Token não encontrado no localStorage
❌ PROPERTY-DETAILS - ModerationService disponível? false
❌ MODERATION - Token não encontrado
❌ MODERATION - Erro ao buscar propriedade: 401
❌ MODERATION - Propriedade não encontrada na lista
❌ APPROVE - Erro ao atualizar propriedade: [error]
❌ APPROVE - Erro ao criar notificação in-app: [error]
❌ APPROVE - Erro ao enviar push notification: [error]
```

### ✅ 2. Verificar Network Tab

#### **✅ Requisições Esperadas:**
```
GET /api/admin/properties?page=1&limit=1000 (200)
POST /api/admin/approve (200)
POST /api/notifications?action=property-approved (200)
```

#### **❌ Requisições com Erro:**
```
GET /api/admin/properties (401) - Token inválido
POST /api/admin/approve (500) - Erro interno
POST /api/notifications (404) - Endpoint não encontrado
```

### ✅ 3. Verificar Vercel Logs

#### **✅ Logs Esperados:**
```
🔍 MIDDLEWARE - Verificando perfil para user ID: [user_id]
🔍 MIDDLEWARE - Profile encontrado: [profile]
🔍 MIDDLEWARE - is_admin value: true
🔍 APPROVE - Aprovando propriedade: [property_id]
✅ APPROVE - Propriedade atualizada: [data]
✅ APPROVE - Notificação in-app criada
📱 APPROVE - Enviando push notification...
✅ APPROVE - Push notification enviada
```

#### **❌ Logs de Erro:**
```
❌ MIDDLEWARE - Usuário não é admin: [profile]
❌ APPROVE - Erro ao atualizar propriedade: [error]
❌ APPROVE - Erro ao criar notificação in-app: [error]
❌ APPROVE - Erro ao enviar push notification: [error]
```

---

## 🛠️ Ferramentas de Debug

### ✅ 1. Console do Browser

**Abrir:** F12 → Console

**Comandos úteis:**
```javascript
// Verificar token
localStorage.getItem('adminToken')

// Verificar usuário
localStorage.getItem('adminUser')

// Verificar ModerationService
window.ModerationService

// Limpar cache
localStorage.clear()
```

### ✅ 2. Network Tab

**Abrir:** F12 → Network

**Verificar:**
- **Status codes:** 200, 401, 404, 500
- **Headers:** Authorization, Content-Type
- **Response:** JSON válido
- **Timing:** Latência das requisições

### ✅ 3. Vercel Dashboard

**Acessar:** [Vercel Dashboard](https://vercel.com/dashboard)

**Verificar:**
- **Functions:** Logs em tempo real
- **Deployments:** Status do deploy
- **Environment Variables:** Configurações corretas

### ✅ 4. Supabase Dashboard

**Acessar:** [Supabase Dashboard](https://supabase.com/dashboard)

**Verificar:**
- **Database:** Tabelas e dados
- **Auth:** Usuários e sessões
- **Logs:** Queries e erros
- **RLS:** Políticas de segurança

---

## 🔧 Soluções Rápidas

### ✅ 1. Reset Completo

```javascript
// Limpar localStorage
localStorage.clear()

// Recarregar página
window.location.reload()

// Fazer login novamente
// Acessar: https://buscabuscaimoveis-admin-qa.vercel.app
```

### ✅ 2. Verificar Configuração

```javascript
// Verificar API Base URL
console.log('API_BASE_URL:', API_BASE_URL)

// Verificar token
console.log('Token:', localStorage.getItem('adminToken'))

// Verificar usuário
console.log('User:', localStorage.getItem('adminUser'))
```

### ✅ 3. Testar Endpoints

```javascript
// Testar endpoint de propriedades
fetch(`${API_BASE_URL}/api/admin/properties?page=1&limit=5`, {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => console.log('Properties:', data))
.catch(error => console.error('Error:', error))
```

---

## 📞 Suporte

### ✅ 1. Logs Importantes

**Sempre incluir:**
- **Console logs** completos
- **Network requests** com status
- **Vercel logs** relevantes
- **Supabase logs** se aplicável

### ✅ 2. Informações do Sistema

**Sempre fornecer:**
- **URL atual** do admin panel
- **Token** (primeiros 20 caracteres)
- **User ID** (primeiros 8 caracteres)
- **Property ID** que está testando

### ✅ 3. Passos para Reproduzir

**Sempre descrever:**
1. **Ação realizada** (clicar em aprovar/rejeitar)
2. **Resultado esperado** (propriedade aprovada/rejeitada)
3. **Resultado atual** (erro ou comportamento inesperado)
4. **Logs relevantes** (console, network, backend)

---

## 🎯 Checklist de Verificação

### ✅ Antes de Reportar Problema

- [ ] **Login funcionando** no admin panel
- [ ] **Token válido** no localStorage
- [ ] **ModerationService carregado** (window.ModerationService)
- [ ] **API endpoints** respondendo (200)
- [ ] **Console logs** sem erros críticos
- [ ] **Network requests** com status 200
- [ ] **Vercel logs** sem erros
- [ ] **Supabase** funcionando

### ✅ Informações para Suporte

- [ ] **URL do admin panel** atual
- [ ] **Console logs** completos
- [ ] **Network tab** com requisições
- [ ] **Vercel logs** relevantes
- [ ] **Passos para reproduzir** o problema
- [ ] **Resultado esperado** vs **resultado atual**

---

## 🚀 Sistema Funcionando

### ✅ Indicadores de Sucesso

- **✅ Login:** Sem erros de autenticação
- **✅ Propriedades:** Lista carregando corretamente
- **✅ Botões:** Aprovar/Rejeitar funcionando
- **✅ Notificações:** In-app e push sendo enviadas
- **✅ UI:** Atualizando corretamente após ações
- **✅ Logs:** Sem erros críticos

**Sistema totalmente funcional!** 🚀
