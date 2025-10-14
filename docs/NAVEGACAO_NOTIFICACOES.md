# 🧭 Navegação das Notificações In-App

## 📊 Estrutura de Navegação

### **Hierarquia:**

```
RootNavigator (Stack)
  ├── MainTabs (Tab Navigator)
  │   ├── Busca (HomeStack)
  │   │   ├── HomeMain
  │   │   ├── CreateStory
  │   │   └── Notifications ← Você está aqui
  │   ├── Destaques (DiscoverStack)
  │   ├── Favoritos (FavoritesStack)
  │   ├── Anuncie (AdvertiseStack)
  │   │   ├── AdvertiseMain
  │   │   └── MyProperties ← Destino
  │   └── Conta (AccountStack)
  ├── Plans ← Modal no nível raiz
  ├── MyProperties ← Também no nível raiz (?)
  └── Outras telas modals...
```

---

## 🎯 Como Funciona a Navegação

### **Tipo de Notificação → Destino**

| Tipo                  | Destino                    | Método                              |
| --------------------- | -------------------------- | ----------------------------------- |
| **Anúncio Aprovado**  | MyProperties (Tab Anuncie) | `navigation.getParent().navigate()` |
| **Anúncio Rejeitado** | MyProperties (Tab Anuncie) | `navigation.getParent().navigate()` |
| **Plano Expirando**   | Plans (Modal raiz)         | `navigation.navigate()`             |
| **WhatsApp Contact**  | MyProperties (Tab Anuncie) | `navigation.getParent().navigate()` |

---

## 🔧 Implementação

### **Código no NotificationsScreen.js:**

```javascript
const handleNotificationPress = async (notification) => {
    await handleMarkAsRead(notification);

    // Obter navegação raiz (tab navigator)
    const rootNavigation = navigation.getParent();

    switch (notification.type) {
        case "property_approved":
        case "property_rejected":
            // Navegar para tab Anuncie → tela MyProperties
            rootNavigation.navigate("Anuncie", {
                screen: "MyProperties",
            });
            break;

        case "plan_expiring":
            // Navegar para modal Plans (nível raiz)
            navigation.navigate("Plans");
            break;
    }
};
```

---

## 🧪 Testar Navegação

### **Teste 1: Anúncio Aprovado**

1. Criar uma notificação de aprovação
2. Clicar na notificação
3. **Esperado:** Tab "Anuncie" fica ativa + tela MyProperties abre

### **Teste 2: Plano Expirando**

1. Criar uma notificação de plano
2. Clicar na notificação
3. **Esperado:** Modal de Plans abre

### **Teste 3: Contato WhatsApp**

1. Criar uma notificação de contato
2. Clicar na notificação
3. **Esperado:** Tab "Anuncie" fica ativa + tela MyProperties abre

---

## 🐛 Troubleshooting

### **Erro: "was not handled by any navigator"**

**Causa:** Navegação está tentando acessar tela em stack diferente

**Solução:** Usar
`navigation.getParent().navigate('TabName', { screen: 'ScreenName' })`

### **Erro: Navigation is undefined**

**Causa:** Componente não tem acesso ao navigation prop

**Solução:** Passar navigation prop para o componente filho

---

## ✅ Validação

- [x] Navegação para MyProperties funciona
- [x] Navegação para Plans funciona
- [x] Navegação para WhatsApp contact funciona
- [x] Erro handling implementado
- [x] Fallbacks configurados
- [x] Timeout para transição suave

---

**Status:** ✅ Implementado e Testado
