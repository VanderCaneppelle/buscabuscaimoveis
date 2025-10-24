# 🔧 Fluxo de Moderação Completo

## 📋 Visão Geral

Documentação completa do fluxo de aprovação e rejeição de propriedades no
sistema Busca Busca Imóveis, incluindo notificações in-app e push.

---

## 🏗️ Arquitetura do Sistema

### ✅ Componentes Principais

| Componente       | Função                      | Tecnologia                    |
| ---------------- | --------------------------- | ----------------------------- |
| **Admin Panel**  | Interface de moderação      | HTML/JS + API Segura          |
| **Backend API**  | Processamento e banco       | Vercel Functions + Supabase   |
| **App Mobile**   | Recebimento de notificações | React Native + Expo           |
| **Notificações** | In-app + Push               | Supabase + Expo Notifications |

---

## 🔄 Fluxo de Aprovação

### ✅ 1. Interface Admin

**Arquivo:** `admin/property-details.js`

```javascript
// Botão de aprovação
approveBtn.addEventListener("click", async () => {
    console.log("🔍 PROPERTY-DETAILS - Botão de aprovação clicado!");

    const ok = confirm("Confirmar aprovação deste anúncio?");
    if (!ok) return;

    try {
        // Chamar ModerationService
        await window.ModerationService.approveProperty(propertyId);

        // Atualizar UI
        await updatePropertyStatusUI(propertyId, "approved");
        alert("Anúncio aprovado e ativado com sucesso!");
    } catch (err) {
        console.error("❌ PROPERTY-DETAILS - Erro ao aprovar:", err);
        alert("Erro ao aprovar anúncio. Tente novamente.");
    }
});
```

### ✅ 2. ModerationService

**Arquivo:** `admin/moderationService.js`

```javascript
async function approveProperty(propertyId) {
    try {
        console.log("🔍 MODERATION - Iniciando aprovação:", propertyId);

        const token = localStorage.getItem("adminToken");
        if (!token) {
            throw new Error("Token de autenticação não encontrado");
        }

        // 1. Buscar user_id da propriedade
        const propertyResponse = await fetch(
            `${BACKEND_BASE}/api/admin/properties?page=1&limit=1000`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const propertyData = await propertyResponse.json();
        const property = propertyData.data?.find((p) => p.id === propertyId);

        if (!property) {
            throw new Error("Propriedade não encontrada");
        }

        // 2. Chamar API de aprovação
        const response = await fetch(`${BACKEND_BASE}/api/admin/approve`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                propertyId: propertyId,
                userId: property.user_id,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erro ao aprovar propriedade");
        }

        console.log(`✅ Anúncio ${propertyId} aprovado e ativado com sucesso`);
        return { success: true };
    } catch (error) {
        console.error("Erro ao aprovar propriedade:", error);
        throw error;
    }
}
```

### ✅ 3. Backend API

**Arquivo:** `backend/api/admin/approve.js`

```javascript
async function handler(req, res) {
    try {
        const { propertyId, userId } = req.body;

        console.log("🔍 APPROVE - Aprovando propriedade:", propertyId);
        console.log("🔍 APPROVE - User ID:", userId);

        // 1. Atualizar propriedade no banco
        const { data, error } = await supabase
            .from("properties")
            .update({
                status: "approved",
                ad_status: "active",
                updated_at: new Date().toISOString(),
            })
            .eq("id", propertyId)
            .select("id, title, user_id")
            .single();

        if (error) {
            console.error("❌ APPROVE - Erro ao atualizar propriedade:", error);
            return res.status(500).json({ error: "Failed to update property" });
        }

        console.log("✅ APPROVE - Propriedade atualizada:", data);

        // 2. Criar notificação in-app
        const { error: notificationError } = await supabase
            .from("in_app_notifications")
            .insert({
                user_id: data.user_id,
                type: "property_approved",
                title: "✅ Anúncio Aprovado!",
                message:
                    `Seu anúncio "${data.title}" foi aprovado e agora está visível para todos!`,
                data: {
                    property_id: propertyId,
                    property_title: data.title,
                    action: "view_property",
                },
            });

        if (notificationError) {
            console.error(
                "❌ APPROVE - Erro ao criar notificação in-app:",
                notificationError,
            );
        } else {
            console.log("✅ APPROVE - Notificação in-app criada");
        }

        // 3. Enviar push notification
        try {
            console.log("📱 APPROVE - Enviando push notification...");
            const pushResponse = await fetch(
                `${
                    process.env.API_BASE_URL ||
                    "https://buscabuscaimoveis-qa.vercel.app"
                }/api/notifications?action=property-approved`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId: data.user_id,
                        propertyId: propertyId,
                    }),
                },
            );

            if (pushResponse.ok) {
                console.log("✅ APPROVE - Push notification enviada");
            } else {
                console.error(
                    "❌ APPROVE - Erro ao enviar push notification:",
                    pushResponse.status,
                );
            }
        } catch (pushError) {
            console.error(
                "❌ APPROVE - Erro ao enviar push notification:",
                pushError,
            );
        }

        return res.status(200).json({
            success: true,
            message: "Property approved successfully",
        });
    } catch (error) {
        console.error("❌ APPROVE - Erro interno:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
```

---

## 🔄 Fluxo de Rejeição

### ✅ 1. Interface Admin

**Arquivo:** `admin/property-details.js`

```javascript
// Botão de rejeição
rejectBtn.addEventListener("click", async () => {
    console.log("🔍 PROPERTY-DETAILS - Botão de rejeição clicado!");

    const reason = prompt("Motivo da rejeição (opcional):");

    try {
        // Chamar ModerationService
        await window.ModerationService.rejectProperty(propertyId, reason);

        // Atualizar UI
        await updatePropertyStatusUI(propertyId, "rejected");
        alert("Anúncio rejeitado com sucesso!");
    } catch (err) {
        console.error("❌ PROPERTY-DETAILS - Erro ao rejeitar:", err);
        alert("Erro ao rejeitar anúncio. Tente novamente.");
    }
});
```

### ✅ 2. ModerationService

**Arquivo:** `admin/moderationService.js`

```javascript
async function rejectProperty(propertyId, reason = null) {
    try {
        console.log("🔍 MODERATION - Iniciando rejeição:", propertyId);

        const token = localStorage.getItem("adminToken");
        if (!token) {
            throw new Error("Token de autenticação não encontrado");
        }

        // 1. Buscar user_id da propriedade
        const propertyResponse = await fetch(
            `${BACKEND_BASE}/api/admin/properties?page=1&limit=1000`,
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        const propertyData = await propertyResponse.json();
        const property = propertyData.data?.find((p) => p.id === propertyId);

        if (!property) {
            throw new Error("Propriedade não encontrada");
        }

        // 2. Chamar API de rejeição
        const response = await fetch(`${BACKEND_BASE}/api/admin/reject`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                propertyId: propertyId,
                userId: property.user_id,
                reason: reason,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.message || "Erro ao rejeitar propriedade",
            );
        }

        console.log(`❌ Anúncio ${propertyId} rejeitado com sucesso`);
        return { success: true };
    } catch (error) {
        console.error("Erro ao rejeitar propriedade:", error);
        throw error;
    }
}
```

### ✅ 3. Backend API

**Arquivo:** `backend/api/admin/reject.js`

```javascript
async function handler(req, res) {
    try {
        const { propertyId, userId, reason } = req.body;

        console.log("🔍 REJECT - Rejeitando propriedade:", propertyId);
        console.log("🔍 REJECT - User ID:", userId);
        console.log("🔍 REJECT - Motivo:", reason);

        // 1. Atualizar propriedade no banco
        const { data, error } = await supabase
            .from("properties")
            .update({
                status: "rejected",
                ad_status: "inactive",
                updated_at: new Date().toISOString(),
            })
            .eq("id", propertyId)
            .select("id, title, user_id")
            .single();

        if (error) {
            console.error("❌ REJECT - Erro ao atualizar propriedade:", error);
            return res.status(500).json({ error: "Failed to update property" });
        }

        console.log("✅ REJECT - Propriedade atualizada:", data);

        // 2. Criar notificação in-app
        const message = reason
            ? `Seu anúncio "${data.title}" foi rejeitado. Motivo: ${reason}`
            : `Seu anúncio "${data.title}" foi rejeitado. Entre em contato para mais informações.`;

        const { error: notificationError } = await supabase
            .from("in_app_notifications")
            .insert({
                user_id: data.user_id,
                type: "property_rejected",
                title: "❌ Anúncio Rejeitado",
                message: message,
                data: {
                    property_id: propertyId,
                    property_title: data.title,
                    reason: reason || "Não especificado",
                    action: "view_property",
                },
            });

        if (notificationError) {
            console.error(
                "❌ REJECT - Erro ao criar notificação in-app:",
                notificationError,
            );
        } else {
            console.log("✅ REJECT - Notificação in-app criada");
        }

        // 3. Enviar push notification
        try {
            console.log("📱 REJECT - Enviando push notification...");
            const pushResponse = await fetch(
                `${
                    process.env.API_BASE_URL ||
                    "https://buscabuscaimoveis-qa.vercel.app"
                }/api/notifications?action=property-rejected`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userId: data.user_id,
                        propertyId: propertyId,
                        reason: reason,
                    }),
                },
            );

            if (pushResponse.ok) {
                console.log("✅ REJECT - Push notification enviada");
            } else {
                console.error(
                    "❌ REJECT - Erro ao enviar push notification:",
                    pushResponse.status,
                );
            }
        } catch (pushError) {
            console.error(
                "❌ REJECT - Erro ao enviar push notification:",
                pushError,
            );
        }

        return res.status(200).json({
            success: true,
            message: "Property rejected successfully",
        });
    } catch (error) {
        console.error("❌ REJECT - Erro interno:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
```

---

## 📱 Recebimento de Notificações

### ✅ App Mobile

**Arquivo:** `components/NotificationsScreen.js`

```javascript
// Carregar notificações
const loadNotifications = async () => {
    if (!user?.id) return;
    console.log(
        "🔔 [NotificationsScreen] Carregando notificações para user:",
        user.id.substring(0, 8),
    );

    setLoading(true);
    try {
        const data = await InAppNotificationAPI.getNotifications(user.id);
        console.log(
            "🔔 [NotificationsScreen] Notificações carregadas:",
            data.length,
        );
        setNotifications(data);
    } catch (error) {
        console.error(
            "❌ [NotificationsScreen] Erro ao carregar notificações:",
            error,
        );
        Alert.alert("Erro", "Não foi possível carregar as notificações");
    } finally {
        setLoading(false);
    }
};

// Realtime para novas notificações
useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
        .channel("in_app_notifications")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "in_app_notifications",
                filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
                console.log(
                    "🔔 [NotificationsScreen] Nova notificação recebida via Realtime!",
                    payload.new,
                );
                console.log("🔔 [NotificationsScreen] Tipo:", payload.new.type);
                console.log(
                    "🔔 [NotificationsScreen] Título:",
                    payload.new.title,
                );
                setNotifications((prev) => [payload.new, ...prev]);
            },
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, [user?.id]);
```

### ✅ Notification Bell

**Arquivo:** `components/NotificationBell.js`

```javascript
// Realtime para contador
useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
        .channel("notification_bell")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "in_app_notifications",
                filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
                console.log(
                    "🔔 [NotificationBell] Nova notificação recebida via Realtime!",
                    payload.new,
                );
                console.log("🔔 [NotificationBell] Tipo:", payload.new.type);
                console.log("🔔 [NotificationBell] Título:", payload.new.title);
                setUnreadCount((prev) => prev + 1);
            },
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, [user?.id]);
```

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
        // Verificar token com Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return { valid: false, error: "Invalid token" };
        }

        // Verificar se é admin
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

## 🔍 Logs de Debug

### ✅ Frontend (Admin Panel)

```javascript
console.log("🔍 PROPERTY-DETAILS - Botão de aprovação clicado!");
console.log(
    "🔍 PROPERTY-DETAILS - ModerationService disponível?",
    !!window.ModerationService,
);
console.log("🔍 MODERATION - Iniciando aprovação:", propertyId);
console.log("🔍 MODERATION - Token encontrado:", token ? "SIM" : "NÃO");
console.log("🔍 MODERATION - Buscando propriedade para aprovação...");
console.log("🔍 MODERATION - Resposta da busca:", propertyResponse.status);
console.log(
    "🔍 MODERATION - Dados recebidos:",
    propertyData.data?.length || 0,
    "propriedades",
);
console.log("🔍 MODERATION - Propriedade encontrada:", !!property);
console.log("🔍 MODERATION - Chamando API de aprovação...");
```

### ✅ Backend (API)

```javascript
console.log("🔍 APPROVE - Aprovando propriedade:", propertyId);
console.log("🔍 APPROVE - User ID:", userId);
console.log("✅ APPROVE - Propriedade atualizada:", data);
console.log("✅ APPROVE - Notificação in-app criada");
console.log("📱 APPROVE - Enviando push notification...");
console.log("✅ APPROVE - Push notification enviada");
```

### ✅ App Mobile

```javascript
console.log(
    "🔔 [NotificationsScreen] Carregando notificações para user:",
    user.id.substring(0, 8),
);
console.log("🔔 [NotificationsScreen] Notificações carregadas:", data.length);
console.log(
    "🔔 [NotificationsScreen] Nova notificação recebida via Realtime!",
    payload.new,
);
console.log("🔔 [NotificationsScreen] Tipo:", payload.new.type);
console.log("🔔 [NotificationsScreen] Título:", payload.new.title);
```

---

## 🎯 Resumo do Fluxo

### ✅ Aprovação Completa

1. **Admin clica "Aprovar"** → `property-details.js`
2. **ModerationService.approveProperty()** → `moderationService.js`
3. **Buscar propriedade** → API `/api/admin/properties`
4. **Chamar aprovação** → API `/api/admin/approve`
5. **Backend atualiza banco** → Supabase `properties` table
6. **Backend cria notificação in-app** → Supabase `in_app_notifications` table
7. **Backend envia push notification** → API `/api/notifications`
8. **App recebe notificação** → Realtime + Push
9. **Frontend atualiza UI** → `property-details.js`

### ✅ Rejeição Completa

1. **Admin clica "Rejeitar"** → `property-details.js`
2. **ModerationService.rejectProperty()** → `moderationService.js`
3. **Buscar propriedade** → API `/api/admin/properties`
4. **Chamar rejeição** → API `/api/admin/reject`
5. **Backend atualiza banco** → Supabase `properties` table
6. **Backend cria notificação in-app** → Supabase `in_app_notifications` table
7. **Backend envia push notification** → API `/api/notifications`
8. **App recebe notificação** → Realtime + Push
9. **Frontend atualiza UI** → `property-details.js`

---

## 🚀 Sistema Totalmente Funcional

### ✅ Componentes Integrados

- **✅ Interface Admin:** Funcional com botões
- **✅ API Segura:** Autenticação e autorização
- **✅ Banco de Dados:** Atualização automática
- **✅ Notificações In-app:** Criação e recebimento
- **✅ Push Notifications:** Envio e recebimento
- **✅ Realtime:** Atualizações instantâneas
- **✅ Logs Detalhados:** Debug completo

**Sistema de moderação totalmente funcional e integrado!** 🚀
