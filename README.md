# 🏠 BuscaBusca Imóveis

Aplicativo React Native para compra, venda e aluguel de imóveis com sistema de planos e pagamentos integrado.

## ✨ Funcionalidades

### 🏘️ Gestão de Imóveis
- **Visualização de Imóveis**: Lista completa com filtros avançados
- **Detalhes Completos**: Informações detalhadas, fotos e localização
- **Sistema de Favoritos**: Salvar e gerenciar imóveis favoritos
- **Busca Inteligente**: Barra de pesquisa com filtros por localização, preço e características

### 👤 Sistema de Usuários
- **Cadastro e Login**: Autenticação segura com Supabase
- **Perfil Completo**: Dados pessoais e preferências
- **Termos de Uso**: Aceitação obrigatória com controle de versão

### 📱 Interface Moderna
- **Design Responsivo**: Adaptado para diferentes tamanhos de tela
- **Tema Adaptativo**: Suporte a modo claro/escuro
- **Navegação Intuitiva**: Bottom tabs e navegação em stack
- **Stories**: Seção de destaque para imóveis especiais

### 💳 Sistema de Planos e Pagamentos
- **Planos Flexíveis**: Gratuito, Bronze, Prata e Ouro
- **Integração Mercado Pago**: Pagamentos seguros via PIX, cartão e boleto
- **Gestão de Assinaturas**: Controle automático de limites e renovação
- **Relatórios**: Histórico completo de pagamentos

### 🛠️ Recursos Técnicos
- **Upload de Mídia**: Fotos e vídeos com otimização automática
- **Geolocalização**: Mapa integrado para localização de imóveis
- **Notificações**: Sistema de alertas e comunicações
- **Performance**: Otimização de imagens e carregamento lazy

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Conta Supabase
- Conta Mercado Pago (para pagamentos)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/buscabuscaimoveis.git
cd buscabuscaimoveis
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=sua_url_do_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# Mercado Pago (para pagamentos)
EXPO_PUBLIC_MERCADO_PAGO_ACCESS_TOKEN=seu_access_token
EXPO_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=sua_public_key
EXPO_PUBLIC_WEBHOOK_URL=https://seu-dominio.com/webhook
```

### 4. Configure o banco de dados
Execute os scripts SQL na seguinte ordem:

```bash
# 1. Schema básico
psql -d seu_banco -f database/schema.sql

# 2. Sistema de planos
psql -d seu_banco -f database/user_plans_system.sql

# 3. Integração de pagamentos
psql -d seu_banco -f database/payment_integration.sql

# 4. Políticas de segurança
psql -d seu_banco -f database/rls_policies.sql
```

### 5. Execute o projeto
```bash
npm start
```

## 📱 Estrutura do Projeto

```
buscabuscaimoveis/
├── components/                 # Componentes React Native
│   ├── HomeScreen.js          # Tela principal
│   ├── PropertyDetailsScreen.js # Detalhes do imóvel
│   ├── PaymentScreen.js       # Tela de pagamento
│   ├── PaymentSuccessScreen.js # Sucesso do pagamento
│   ├── PaymentErrorScreen.js  # Erro do pagamento
│   └── ...
├── lib/                       # Serviços e configurações
│   ├── supabase.js           # Configuração Supabase
│   ├── mercadoPagoService.js # Integração Mercado Pago
│   ├── planService.js        # Gestão de planos
│   └── ...
├── database/                  # Scripts SQL
│   ├── schema.sql            # Schema principal
│   ├── payment_integration.sql # Integração pagamentos
│   └── ...
├── docs/                      # Documentação
│   ├── MERCADO_PAGO_SETUP.md # Configuração Mercado Pago
│   └── ...
└── assets/                    # Imagens e recursos
```

## 💳 Configuração de Pagamentos

### Mercado Pago
O app está integrado com Mercado Pago para processar pagamentos. Veja a documentação completa em [docs/MERCADO_PAGO_SETUP.md](docs/MERCADO_PAGO_SETUP.md).

### Fluxo de Pagamento
1. **Seleção do Plano** → Usuário escolhe um plano
2. **Criação da Preferência** → Sistema cria preferência no Mercado Pago
3. **Redirecionamento** → Usuário é direcionado para checkout
4. **Processamento** → Mercado Pago processa o pagamento
5. **Webhook** → Sistema recebe notificação e atualiza status
6. **Ativação** → Plano é ativado automaticamente

### Planos Disponíveis
- **Gratuito**: Visualização de anúncios
- **Bronze**: 5 anúncios ativos + suporte por email
- **Prata**: 10 anúncios ativos + suporte prioritário + destaque
- **Ouro**: 50 anúncios ativos + suporte 24/7 + relatórios avançados

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm start          # Inicia o servidor de desenvolvimento
npm run android    # Executa no Android
npm run ios        # Executa no iOS
npm run web        # Executa na web
```

### Estrutura de Dados

#### Tabelas Principais
- `users` - Usuários do sistema
- `properties` - Imóveis cadastrados
- `plans` - Planos disponíveis
- `user_subscriptions` - Assinaturas dos usuários
- `payments` - Histórico de pagamentos
- `favorites` - Imóveis favoritos

#### Relacionamentos
- Usuário → Muitos Imóveis
- Usuário → Uma Assinatura Ativa
- Usuário → Muitos Pagamentos
- Usuário → Muitos Favoritos

## 🧪 Testes

### Cartões de Teste (Mercado Pago)
- **Mastercard**: 5031 4332 1540 6351
- **Visa**: 4509 9535 6623 3704
- **American Express**: 3711 8030 3257 522

### Cenários de Teste
1. **Cadastro de usuário**
2. **Criação de anúncio**
3. **Processamento de pagamento**
4. **Ativação de plano**
5. **Sistema de favoritos**

## 📊 Monitoramento

### Métricas Importantes
- Taxa de conversão de planos
- Tempo médio de pagamento
- Métodos de pagamento mais utilizados
- Erros de pagamento
- Performance do app

### Logs
O sistema mantém logs detalhados de:
- Criação de preferências
- Notificações de webhook
- Atualizações de status
- Erros de pagamento

## 🔒 Segurança

### Medidas Implementadas
- **Row Level Security (RLS)** no Supabase
- **Validação de webhooks** do Mercado Pago
- **Criptografia SSL** para pagamentos
- **Controle de acesso** por usuário
- **Logs de auditoria** para transações

### Boas Práticas
- Nunca armazenar dados sensíveis de cartão
- Sempre validar notificações de webhook
- Manter logs de todas as transações
- Testar extensivamente em sandbox
- Monitorar tentativas de fraude

## 🚨 Troubleshooting

### Problemas Comuns

#### Pagamento não processado
1. Verificar credenciais do Mercado Pago
2. Verificar logs do webhook
3. Verificar status da preferência

#### Imóvel não aparece
1. Verificar aprovação do anúncio
2. Verificar permissões do usuário
3. Verificar filtros aplicados

#### Erro de autenticação
1. Verificar configuração do Supabase
2. Verificar chaves de API
3. Verificar políticas RLS

## 📞 Suporte

### Recursos
- [Documentação Mercado Pago](https://www.mercadopago.com.br/developers)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Expo](https://docs.expo.dev/)

### Contato
- **Email**: suporte@buscabuscaimoveis.com
- **WhatsApp**: (11) 99999-9999
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/buscabuscaimoveis/issues)

## 📈 Roadmap

### Próximas Funcionalidades
- [ ] Renovação automática de planos
- [ ] Sistema de notificações push
- [ ] Relatórios avançados
- [ ] Integração com WhatsApp Business
- [ ] Sistema de avaliações
- [ ] Chat entre usuários
- [ ] Assinaturas recorrentes
- [ ] Múltiplos métodos de pagamento

### Melhorias Técnicas
- [ ] Otimização de performance
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Monitoramento avançado
- [ ] Backup automático

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor, leia o [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar um pull request.

---

**Desenvolvido com ❤️ para facilitar a busca de imóveis** 