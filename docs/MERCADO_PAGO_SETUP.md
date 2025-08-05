# 🏦 Configuração do Mercado Pago

Este documento explica como configurar e usar a integração com Mercado Pago no BuscaBusca Imóveis.

## 📋 Pré-requisitos

1. **Conta Mercado Pago**: Criar uma conta em [mercadopago.com.br](https://mercadopago.com.br)
2. **Credenciais de API**: Obter Access Token e Public Key
3. **Webhook URL**: URL para receber notificações de pagamento

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Mercado Pago - Produção
EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_WEBHOOK_URL=https://seu-dominio.com/webhook

# Mercado Pago - Sandbox (para testes)
# EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# EXPO_PUBLIC_WEBHOOK_URL=https://seu-dominio.com/webhook
```

### 2. Obter Credenciais

#### Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel/credentials)

1. **Access Token**:
   - Vá em "Credenciais" → "Credenciais de produção"
   - Copie o "Access Token"

2. **Public Key**:
   - Na mesma seção, copie a "Public Key"

3. **Webhook URL**:
   - Configure a URL do seu webhook para receber notificações
   - Exemplo: `https://api.seuapp.com/webhook/mercadopago`

## 🚀 Implementação

### Fluxo de Pagamento

1. **Seleção do Plano** → `PlansScreen`
2. **Criação da Preferência** → `PaymentScreen`
3. **Redirecionamento** → Mercado Pago Web
4. **Retorno** → `PaymentSuccessScreen` ou `PaymentErrorScreen`
5. **Webhook** → Atualização automática do status

### Arquivos Principais

- `lib/mercadoPagoService.js` - Serviço de integração
- `components/PaymentScreen.js` - Tela de pagamento
- `components/PaymentSuccessScreen.js` - Tela de sucesso
- `components/PaymentErrorScreen.js` - Tela de erro

## 🔄 Webhook

### Endpoint Necessário

Crie um endpoint para receber notificações do Mercado Pago:

```javascript
// Exemplo de webhook (Node.js/Express)
app.post('/webhook/mercadopago', async (req, res) => {
  try {
    const { data } = req.body;
    
    // Processar notificação
    await MercadoPagoService.processWebhook(data);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});
```

### Tipos de Notificação

- `payment.created` - Pagamento criado
- `payment.updated` - Pagamento atualizado
- `payment.approved` - Pagamento aprovado
- `payment.rejected` - Pagamento rejeitado
- `payment.cancelled` - Pagamento cancelado

## 🧪 Testes

### Cartões de Teste

Use estes cartões para testar:

| Tipo | Número | CVV | Data |
|------|--------|-----|------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 |
| American Express | 3711 8030 3257 522 | 1234 | 11/25 |

### PIX de Teste

Para PIX, use o QR Code gerado pelo Mercado Pago em modo sandbox.

## 📊 Monitoramento

### Logs Importantes

Monitore estes eventos:

- Criação de preferências
- Notificações de webhook
- Atualizações de status
- Erros de pagamento

### Métricas

- Taxa de conversão
- Tempo médio de pagamento
- Métodos mais utilizados
- Erros mais comuns

## 🔒 Segurança

### Boas Práticas

1. **HTTPS**: Sempre use HTTPS em produção
2. **Validação**: Valide todas as notificações do webhook
3. **Logs**: Mantenha logs de todas as transações
4. **Testes**: Teste extensivamente em sandbox
5. **Backup**: Mantenha backup dos dados de pagamento

### Validação de Webhook

```javascript
// Validar assinatura do webhook
const validateWebhook = (req, res, next) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);
  
  // Implementar validação da assinatura
  // conforme documentação do Mercado Pago
  
  next();
};
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Webhook não recebido**:
   - Verificar URL do webhook
   - Verificar logs do servidor
   - Testar endpoint manualmente

2. **Pagamento não atualizado**:
   - Verificar processamento do webhook
   - Verificar logs de erro
   - Verificar conexão com banco

3. **Erro de credenciais**:
   - Verificar variáveis de ambiente
   - Verificar permissões da conta
   - Verificar modo (sandbox/produção)

### Logs de Debug

```javascript
// Adicionar logs detalhados
console.log('Preferência criada:', preference);
console.log('Pagamento registrado:', payment);
console.log('Webhook recebido:', webhookData);
```

## 📞 Suporte

### Recursos Úteis

- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers)
- [API Reference](https://www.mercadopago.com.br/developers/reference)
- [Webhooks](https://www.mercadopago.com.br/developers/docs/webhooks)
- [Checkout API](https://www.mercadopago.com.br/developers/docs/checkout-api)

### Contato

Para dúvidas sobre a integração:
- Email: suporte@buscabuscaimoveis.com
- WhatsApp: (11) 99999-9999

## 📈 Próximos Passos

1. **Implementar renovação automática**
2. **Adicionar relatórios de pagamento**
3. **Implementar reembolsos**
4. **Adicionar múltiplos métodos de pagamento**
5. **Implementar assinaturas recorrentes** 