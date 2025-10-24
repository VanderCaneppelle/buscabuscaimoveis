# 🌍 Sistema de Ambientes e Credenciais

## 📋 Visão Geral

O sistema Busca Busca Imóveis possui configuração inteligente para múltiplos
ambientes (QA e Produção), com detecção automática baseada em variáveis de
ambiente e hostnames.

---

## 🏗️ Arquitetura de Ambientes

### ✅ Ambientes Configurados

| Ambiente     | Branch | Supabase                           | Vercel Backend                    | Admin Panel                        |
| ------------ | ------ | ---------------------------------- | --------------------------------- | ---------------------------------- |
| **QA**       | `qa`   | `ftglfnmyxtnygrmkxwos.supabase.co` | `buscabuscaimoveis-qa.vercel.app` | `buscabusca-admin-qa.vercel.app`   |
| **PRODUÇÃO** | `main` | `rxozhlxmfbioqgqomkrz.supabase.co` | `buscabusca.vercel.app`           | `buscabusca-admin-prod.vercel.app` |

---

## 📱 App Mobile (Expo)

### ✅ Configuração Principal

**Arquivo:** `app.config.js`

```javascript
export default {
    expo: {
        // ... outras configurações
        extra: {
            // ✅ AMBIENTE (production ou qa)
            EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT ||
                "qa",

            // ✅ SUPABASE - PRODUÇÃO
            EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
            EXPO_PUBLIC_SUPABASE_ANON_KEY:
                process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
            API_BASE_URL: process.env.API_BASE_URL,
            RESET_PASSWORD_URL: process.env.RESET_PASSWORD_URL,
        },
    },
};
```

### ✅ Detecção de Ambiente

**Arquivo:** `lib/supabase.js`

```javascript
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl = extra.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

**Arquivo:** `lib/backendService.js`

```javascript
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL;
```

---

## 🖥️ Admin Panel

### ✅ Configuração Principal

**Arquivo:** `admin/property-details.js`

```javascript
function getApiBaseUrl() {
    // Detectar ambiente baseado na URL atual
    if (window.location.hostname.includes("buscabusca-admin-qa")) {
        return "https://buscabuscaimoveis-qa.vercel.app"; // ✅ QA
    } else if (window.location.hostname.includes("buscabusca-admin-prod")) {
        return "https://buscabusca.vercel.app"; // ✅ PRODUÇÃO
    } else {
        return "https://buscabusca-qa.vercel.app"; // ✅ FALLBACK QA
    }
}
```

### ✅ Autenticação

**Arquivo:** `admin/property-details.js`

```javascript
function loadAuthData() {
    try {
        authToken = localStorage.getItem("adminToken");
        currentUser = JSON.parse(localStorage.getItem("adminUser") || "null");

        if (!authToken) {
            window.location.href = "index.html";
            return false;
        }

        return true;
    } catch (error) {
        window.location.href = "index.html";
        return false;
    }
}
```

---

## 🔧 Backend (Vercel)

### ✅ Configuração de Ambientes

| Variável                    | QA                                         | Produção                                   |
| --------------------------- | ------------------------------------------ | ------------------------------------------ |
| `SUPABASE_URL`              | `https://ftglfnmyxtnygrmkxwos.supabase.co` | `https://rxozhlxmfbioqgqomkrz.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | QA Service Key                             | Production Service Key                     |
| `API_BASE_URL`              | `https://buscabuscaimoveis-qa.vercel.app`  | `https://buscabusca.vercel.app`            |
| `CLOUDINARY_URL`            | QA Cloudinary                              | Production Cloudinary                      |
| `MERCADO_PAGO_ACCESS_TOKEN` | QA Token                                   | Production Token                           |

### ✅ Endpoints Admin

| Endpoint                      | Descrição               | Autenticação |
| ----------------------------- | ----------------------- | ------------ |
| `/api/admin/login`            | Login do admin          | -            |
| `/api/admin/properties`       | Listar propriedades     | Bearer Token |
| `/api/admin/property-details` | Detalhes da propriedade | Bearer Token |
| `/api/admin/approve`          | Aprovar propriedade     | Bearer Token |
| `/api/admin/reject`           | Rejeitar propriedade    | Bearer Token |
| `/api/admin/stats`            | Estatísticas            | Bearer Token |
| `/api/admin/user-profile`     | Perfil do usuário       | Bearer Token |
| `/api/admin/user-email`       | Email do usuário        | Bearer Token |

---

## 🔐 Segurança

### ✅ Autenticação Admin

**Arquivo:** `backend/api/admin/middleware.js`

```javascript
export async function verifyAdminToken(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { valid: false, error: "No token provided" };
    }

    const token = authHeader.substring(7);

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return { valid: false, error: "Invalid token" };
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_admin, full_name")
            .eq("id", user.id)
            .single();

        if (profileError || !profile || !profile.is_admin) {
            return { valid: false, error: "Not an admin" };
        }

        return { valid: true, user };
    } catch (error) {
        return { valid: false, error: "Token verification failed" };
    }
}
```

### ✅ Row Level Security (RLS)

- **App Mobile:** Usa `SUPABASE_ANON_KEY` (limitado por RLS)
- **Backend Admin:** Usa `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- **Admin Panel:** Usa API segura (não acessa Supabase diretamente)

---

## 🚀 Deploy e Configuração

### ✅ Deploy QA

1. **Push para branch `qa`:**
   ```bash
   git push origin qa
   ```

2. **Vercel detecta automaticamente:**
   - Backend: `buscabuscaimoveis-qa.vercel.app`
   - Admin: `buscabusca-admin-qa.vercel.app`

3. **App detecta ambiente:**
   - `EXPO_PUBLIC_ENVIRONMENT = "qa"`
   - Usa credenciais QA

### ✅ Deploy Produção

1. **Push para branch `main`:**
   ```bash
   git push origin main
   ```

2. **Vercel detecta automaticamente:**
   - Backend: `buscabusca.vercel.app`
   - Admin: `buscabusca-admin-prod.vercel.app`

3. **App detecta ambiente:**
   - `EXPO_PUBLIC_ENVIRONMENT = "production"`
   - Usa credenciais Produção

---

## 🔍 Troubleshooting

### ✅ Problemas Comuns

#### **1. App não conecta ao backend correto**

- **Verificar:** `EXPO_PUBLIC_ENVIRONMENT` no `app.config.js`
- **Verificar:** Variáveis de ambiente no Vercel
- **Solução:** Rebuild do app

#### **2. Admin Panel não carrega dados**

- **Verificar:** Token no `localStorage`
- **Verificar:** Hostname correto
- **Solução:** Limpar cache e relogar

#### **3. Backend retorna 401**

- **Verificar:** `SUPABASE_SERVICE_ROLE_KEY` no Vercel
- **Verificar:** Token válido no admin
- **Solução:** Verificar logs do Vercel

### ✅ Logs de Debug

#### **App Mobile:**

```javascript
console.log(
    "🔍 [DEBUG] Ambiente:",
    Constants.expoConfig.extra.EXPO_PUBLIC_ENVIRONMENT,
);
console.log("🔍 [DEBUG] Supabase URL:", supabaseUrl);
console.log("🔍 [DEBUG] API Base URL:", API_BASE_URL);
```

#### **Admin Panel:**

```javascript
console.log("🔍 PROPERTY-DETAILS - API Base URL:", API_BASE_URL);
console.log(
    "🔍 PROPERTY-DETAILS - Token carregado:",
    authToken ? "SIM" : "NÃO",
);
console.log(
    "🔍 PROPERTY-DETAILS - Usuário carregado:",
    currentUser ? "SIM" : "NÃO",
);
```

#### **Backend:**

```javascript
console.log("🔍 MIDDLEWARE - Verificando perfil para user ID:", user.id);
console.log("🔍 MIDDLEWARE - Profile encontrado:", profile);
console.log("🔍 MIDDLEWARE - is_admin value:", profile?.is_admin);
```

---

## 📊 Monitoramento

### ✅ Health Checks

| Componente   | QA                                                   | Produção                                   |
| ------------ | ---------------------------------------------------- | ------------------------------------------ |
| **App**      | `https://buscabuscaimoveis-qa.vercel.app/api/health` | `https://buscabusca.vercel.app/api/health` |
| **Admin**    | `https://buscabusca-admin-qa.vercel.app`             | `https://buscabusca-admin-prod.vercel.app` |
| **Supabase** | QA Database                                          | Production Database                        |

### ✅ Logs

- **Vercel:** Dashboard → Functions → Logs
- **Supabase:** Dashboard → Logs
- **App:** Console do dispositivo/emulador

---

## 🎯 Resumo

### ✅ Sistema Inteligente

1. **Detecção Automática:** Baseada em branch e hostname
2. **Credenciais Separadas:** QA e Produção isoladas
3. **Segurança:** RLS + Service Role Key
4. **Monitoramento:** Logs detalhados em todos os componentes

### ✅ Não Precisa Mudar Nada

- **Configuração:** Já está correta
- **Detecção:** Já é automática
- **Credenciais:** Já estão separadas
- **Deploy:** Já funciona automaticamente

**Sistema totalmente configurado e funcionando!** 🚀
