# Backend BuscaBusca Imóveis - Mercado Pago

Backend para integração com Mercado Pago, construído com Vercel Functions.

## 🚀 Estrutura

```
backend/
├── api/
│   ├── payments/
│   │   ├── create.js      # Criar preferência de pagamento
│   │   ├── status.js      # Verificar status do pagamento
│   │   ├── success.js     # Redirecionamento de sucesso
│   │   ├── failure.js     # Redirecionamento de falha
│   │   └── pending.js     # Redirecionamento de pendente
│   └── webhook/
│       └── mercadopago.js # Webhook do Mercado Pago
├── lib/
│   ├── supabase.js        # Cliente Supabase
│   └── mercadoPago.js     # Cliente Mercado Pago
├── package.json
├── vercel.json
└── README.md
```

## 🔧 Configuração

### Variáveis de Ambiente

As seguintes variáveis já estão configuradas no Vercel:

- `EXPO_PUBLIC_SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase
- `EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN`: Token de acesso do Mercado Pago

### Instalação

```bash
npm install
```

### Desenvolvimento Local

```bash
npm run dev
```

### Deploy

```bash
npm run deploy
```

## 📡 Endpoints

### POST /api/payments/create
Cria uma preferência de pagamento no Mercado Pago.

**Body:**
```json
{
  "plan": {
    "id": "uuid",
    "name": "premium",
    "display_name": "Premium",
    "price": 29.90
  },
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "Nome do Usuário"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "preference": {
    "id": "preference_id",
    "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
    "sandbox_init_point": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
  },
  "payment": {
    "id": "payment_uuid",
    "status": "pending"
  }
}
```

### GET /api/payments/status?paymentId=uuid
Verifica o status de um pagamento.

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "uuid",
    "status": "approved",
    "preference_id": "preference_id",
    "payment_id": "payment_id",
    "amount": 29.90,
    "description": "Plano Premium - premium",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/webhook/mercadopago
Webhook para receber notificações do Mercado Pago.

## 🔗 URLs de Redirecionamento

- **Sucesso:** `https://buscabusca.vercel.app/api/payments/success`
- **Falha:** `https://buscabusca.vercel.app/api/payments/failure`
- **Pendente:** `https://buscabusca.vercel.app/api/payments/pending`

## 🔔 Webhook URL

Configure no Mercado Pago:
`https://buscabusca.vercel.app/api/webhook/mercadopago` 