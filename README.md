# BuscaBuscaImoveis - App Mobile

App mobile React Native + Expo com autenticação Supabase.

## Estrutura do Projeto

```
buscabuscaimoveis/
├── app/                    # Expo Router (navegação baseada em arquivos)
│   ├── (auth)/            # Telas de autenticação
│   │   ├── login.tsx      # Tela de login
│   │   └── register.tsx   # Tela de cadastro
│   ├── (app)/             # Telas da aplicação principal
│   │   └── home.tsx       # Tela principal após login
│   ├── _layout.tsx        # Layout principal
│   └── index.tsx          # Redirecionamento baseado em auth
├── contexts/
│   └── AuthContext.tsx    # Contexto de autenticação
├── lib/
│   └── supabase.ts        # Configuração do Supabase
└── assets/                # Imagens e recursos
```

## Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar Supabase
1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá em Settings > API
4. Copie a URL e a anon key
5. Edite o arquivo `config.ts` e substitua:
   - `SUA_URL_DO_SUPABASE` pela URL do seu projeto
   - `SUA_CHAVE_ANONIMA_DO_SUPABASE` pela anon key

### 3. Configurar autenticação no Supabase
1. No dashboard do Supabase, vá em Authentication > Settings
2. Em "Site URL", adicione: `exp://localhost:8081`
3. Em "Redirect URLs", adicione: `exp://localhost:8081/*`

## Executar o projeto

```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios

# Executar na web
npm run web
```

## Funcionalidades

- ✅ Login com email/senha
- ✅ Cadastro de usuário
- ✅ Persistência de sessão
- ✅ Redirecionamento automático
- ✅ Logout
- ✅ Proteção de rotas

## Próximos passos

1. Adicionar validação de formulários
2. Implementar recuperação de senha
3. Adicionar autenticação social (Google, Facebook)
4. Criar telas específicas do seu app
5. Implementar navegação por tabs
6. Adicionar temas e estilos personalizados

## Tecnologias utilizadas

- React Native
- Expo (Managed Workflow)
- Expo Router
- Supabase (Auth + Database)
- TypeScript
- Expo Secure Store 