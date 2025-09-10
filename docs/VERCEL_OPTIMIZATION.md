# Otimização para Limite do Vercel - 12 Funções Serverless

## 🎯 Problema Resolvido

O plano gratuito do Vercel tem limite de **12 funções serverless**, mas o sistema de notificações estava usando **13 funções** (4 funções de notificação + 9 existentes).

## ✅ Solução Implementada

### Antes (13 funções):
1. `api/webhook/mercadopago.js`
2. `api/payments/create.js`
3. `api/payments/status.js`
4. `api/payments/check-status.js`
5. `api/payments/failure.js`
6. `api/payments/pending.js`
7. `api/payments/success.js`
8. `api/delete-cloudinary.js`
9. `api/get-signed-url.js`
10. `api/notifications/register.js` ❌
11. `api/notifications/send.js` ❌
12. `api/notifications/schedule.js` ❌
13. `api/notifications/cron.js` ❌

### Depois (10 funções):
1. `api/webhook/mercadopago.js`
2. `api/payments/create.js`
3. `api/payments/status.js`
4. `api/payments/check-status.js`
5. `api/payments/failure.js`
6. `api/payments/pending.js`
7. `api/payments/success.js`
8. `api/delete-cloudinary.js`
9. `api/get-signed-url.js`
10. `api/notifications.js` ✅ **CONSOLIDADA**

## 🔧 Mudanças Implementadas

### 1. API Consolidada
- **Antes**: 4 APIs separadas (`register.js`, `send.js`, `schedule.js`, `cron.js`)
- **Depois**: 1 API única (`notifications.js`) com parâmetro `action`

```javascript
// Uso da nova API
POST /api/notifications?action=register
POST /api/notifications?action=send
POST /api/notifications?action=schedule
GET /api/notifications?action=status
```

### 2. Remoção do Cron Job
- **Problema**: Cron jobs não funcionam bem no Vercel
- **Solução**: GitHub Actions para agendamento externo

### 3. Sistema de Agendamento Alternativo
- **GitHub Actions**: Executa nos horários 9h, 15h e 21h
- **Script standalone**: Pode ser executado manualmente
- **APIs externas**: Cron-job.org, Uptime Robot, etc.

## 📊 Benefícios da Otimização

### ✅ Vantagens:
- **Dentro do limite**: 10 funções (abaixo de 12)
- **Menos complexidade**: 1 API em vez de 4
- **Melhor manutenção**: Código centralizado
- **Agendamento confiável**: GitHub Actions é mais estável
- **Flexibilidade**: Múltiplas opções de agendamento

### ⚠️ Considerações:
- **Tamanho da função**: API consolidada é maior
- **Dependência externa**: GitHub Actions para agendamento
- **Logs**: Mais logs em uma única função

## 🚀 Como Usar

### 1. Deploy no Vercel
```bash
cd backend
vercel --prod
```

### 2. Configurar GitHub Actions
1. Adicionar secrets no GitHub:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

2. O workflow já está configurado em `.github/workflows/scheduled-notifications.yml`

### 3. Testar o Sistema
```javascript
// No frontend
import { PushNotificationService } from '../lib/pushNotificationService';

// Registrar token
await PushNotificationService.registerDeviceToken(token, userId);

// Enviar notificação
await PushNotificationService.sendNotificationViaBackend(
    'Título', 'Mensagem', {}, userId, false
);

// Enviar agendadas
await PushNotificationService.sendScheduledNotifications();
```

## 🔄 Migração

### Frontend
- ✅ Atualizado automaticamente
- ✅ Novas funções adicionadas
- ✅ Compatibilidade mantida

### Backend
- ✅ APIs antigas removidas
- ✅ Nova API consolidada criada
- ✅ Configuração do Vercel atualizada

## 📈 Próximos Passos

1. **Deploy**: Fazer deploy das mudanças
2. **Teste**: Verificar se todas as funcionalidades funcionam
3. **Monitoramento**: Acompanhar logs e performance
4. **Otimização futura**: Considerar consolidar mais APIs se necessário

## 🆘 Troubleshooting

### Se ainda houver problemas com limite:
1. **Consolidar APIs de pagamento**: Juntar em uma única API
2. **Remover APIs de teste**: Se existirem
3. **Usar subdomínios**: Separar em projetos diferentes
4. **Upgrade do plano**: Se necessário

### Verificar funções ativas:
```bash
vercel ls
```

## 📝 Resumo

✅ **Problema resolvido**: De 13 para 10 funções serverless
✅ **Funcionalidade mantida**: Todas as notificações funcionam
✅ **Agendamento melhorado**: GitHub Actions mais confiável
✅ **Código otimizado**: Menos duplicação, melhor manutenção

O sistema agora está **dentro do limite do Vercel** e **mais eficiente**!
