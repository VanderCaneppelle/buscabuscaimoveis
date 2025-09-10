# Sistema de Notificações Push - BuscaBusca Imóveis

## 📱 Visão Geral

Este sistema implementa notificações push agendadas para lembrar os usuários de conferir o aplicativo nos horários:
- **09:00** - Bom dia! 🌅
- **15:00** - Boa tarde! ☀️
- **21:00** - Boa noite! 🌙

## 🏗️ Arquitetura

### Frontend (React Native/Expo)
- `lib/pushNotificationService.js` - Serviço principal de notificações
- `components/NotificationManager.js` - Componente para gerenciar notificações

### Backend (Vercel Functions)
- `backend/lib/notificationService.js` - Serviço de notificações do backend
- `backend/api/notifications.js` - API consolidada para todas as operações de notificação
- `backend/scripts/send-scheduled-notifications.js` - Script para envio de notificações agendadas
- `.github/workflows/scheduled-notifications.yml` - GitHub Actions para agendamento automático

### Banco de Dados
- `database/device_tokens.sql` - Tabela para armazenar tokens dos dispositivos

## 🚀 Configuração

### 1. Instalar Dependências

```bash
# Backend
cd backend
npm install node-cron

# Frontend (já incluído no package.json)
npm install
```

### 2. Configurar Banco de Dados

Execute o script SQL para criar a tabela de tokens:

```sql
-- Executar o arquivo database/device_tokens.sql
```

### 3. Configurar Variáveis de Ambiente

No backend, certifique-se de ter:
```env
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

No frontend, certifique-se de ter:
```env
EXPO_PUBLIC_API_URL=sua_url_do_backend
```

## 📋 Como Usar

### 1. No Frontend

```javascript
import { PushNotificationService } from '../lib/pushNotificationService';

// Solicitar permissões e agendar notificações
const setupNotifications = async () => {
    // Solicitar permissões
    const hasPermission = await PushNotificationService.requestPermissions();
    
    if (hasPermission) {
        // Obter token do dispositivo
        const token = await PushNotificationService.getExpoPushToken();
        
        // Registrar token no backend
        await PushNotificationService.registerDeviceToken(token, userId);
        
        // Agendar notificações diárias
        await PushNotificationService.scheduleDailyNotifications();
    }
};

// Usar o componente NotificationManager
import NotificationManager from '../components/NotificationManager';

// No seu componente
<NotificationManager />
```

### 2. No Backend

```javascript
import { NotificationService } from './lib/notificationService';

const notificationService = new NotificationService();

// Enviar notificação para todos os dispositivos
await notificationService.sendNotificationToAllDevices(
    'Título',
    'Mensagem',
    { data: 'adicional' }
);

// Enviar notificação para usuário específico
await notificationService.sendNotificationToUser(
    userId,
    'Título',
    'Mensagem',
    { data: 'adicional' }
);
```

## 🔧 API Consolidada

### POST `/api/notifications?action=register`
Registra um token de dispositivo.

**Body:**
```json
{
    "token": "ExponentPushToken[...]",
    "userId": "uuid-do-usuario",
    "platform": "android|ios|web"
}
```

### POST `/api/notifications?action=send`
Envia notificação push.

**Body:**
```json
{
    "title": "Título da notificação",
    "body": "Corpo da notificação",
    "data": { "key": "value" },
    "userId": "uuid-do-usuario", // opcional
    "sendToAll": true // opcional
}
```

### POST `/api/notifications?action=schedule`
Envia notificações agendadas (9h, 15h, 21h).

### GET `/api/notifications?action=status`
Verifica status do sistema de notificações.

## ⏰ Agendamento Automático

O sistema usa **GitHub Actions** para enviar notificações automaticamente:

### Configuração do GitHub Actions
```yaml
# .github/workflows/scheduled-notifications.yml
on:
  schedule:
    # 9h, 15h e 21h (horário de Brasília)
    - cron: '0 12,18,0 * * *'
```

### Alternativas de Agendamento
1. **GitHub Actions** (recomendado) - Gratuito, confiável
2. **Cron-job.org** - Serviço externo gratuito
3. **Uptime Robot** - Monitoramento + agendamento
4. **Script manual** - Executar quando necessário

### Executar Manualmente
```bash
# Via API
curl -X POST "https://seu-dominio.vercel.app/api/notifications?action=schedule"

# Via script local
cd backend
node scripts/send-scheduled-notifications.js
```

## 🧪 Testes

Execute o script de teste:

```bash
node test-notifications.js
```

## 📊 Monitoramento

### Logs do Sistema
- ✅ Sucesso nas operações
- ❌ Erros e falhas
- 📱 Tokens registrados
- 📅 Notificações agendadas
- 🕐 Horários de execução

### Métricas Importantes
- Número de tokens registrados
- Taxa de entrega das notificações
- Dispositivos ativos por plataforma

## 🔒 Segurança

- Tokens são armazenados com RLS (Row Level Security)
- Usuários só podem gerenciar seus próprios tokens
- Sistema pode ler todos os tokens para envio
- Tokens são únicos por dispositivo

## 🚨 Troubleshooting

### Problemas Comuns

1. **Notificações não chegam**
   - Verificar permissões do dispositivo
   - Confirmar se o token está registrado
   - Verificar logs do backend

2. **Erro ao registrar token**
   - Verificar conexão com Supabase
   - Confirmar variáveis de ambiente
   - Verificar estrutura da tabela

3. **Cron jobs não executam**
   - Verificar se o servidor está rodando
   - Confirmar timezone (America/Sao_Paulo)
   - Verificar logs do sistema

### Logs Úteis

```javascript
// Frontend
console.log('📱 Token de notificação:', token);
console.log('✅ Notificações agendadas:', scheduled);

// Backend
console.log('✅ Notificação enviada:', result);
console.log('📅 Agendamento configurado');
```

## 📈 Próximos Passos

1. **Analytics**: Implementar tracking de abertura de notificações
2. **Segmentação**: Notificações baseadas em preferências do usuário
3. **Rich Notifications**: Adicionar imagens e ações
4. **A/B Testing**: Testar diferentes mensagens e horários
5. **Geolocalização**: Notificações baseadas em localização

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do sistema
2. Consultar documentação do Expo Notifications
3. Verificar status do Supabase
4. Testar com o script de teste incluído
