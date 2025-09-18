# Configuração do Firebase para Push Notifications

## 🔧 **Para Resolver o Erro do Firebase:**

### **Erro Atual:**
```
Default FirebaseApp is not initialized in this process com.buscabuscaimoveis.app
```

## 📱 **Soluções:**

### **1. Para Desenvolvimento (Funciona Agora):**
- ✅ O sistema já funciona com token mock
- ✅ Notificações locais funcionam perfeitamente
- ✅ Backend está funcionando
- ⚠️ Push notifications Android precisam de Firebase

### **2. Para Produção (Configuração Completa):**

#### **Passo 1: Criar Projeto Firebase**
1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Nome: "Buca Busca Imóveis"
4. Habilite Google Analytics (opcional)

#### **Passo 2: Configurar Android**
1. No Firebase Console, clique em "Adicionar app" → Android
2. **Nome do pacote**: `com.buscabuscaimoveis.app`
3. **Apelido do app**: Buca Busca Imóveis
4. Baixe o arquivo `google-services.json`
5. Coloque o arquivo na raiz do projeto

#### **Passo 3: Configurar iOS (Opcional)**
1. No Firebase Console, clique em "Adicionar app" → iOS
2. **ID do pacote**: `com.buscabuscaimoveis.app`
3. Baixe o arquivo `GoogleService-Info.plist`
4. Coloque o arquivo na raiz do projeto

#### **Passo 4: Configurar Push Notifications**
1. No Firebase Console, vá em "Cloud Messaging"
2. Clique em "Gerar certificado de push"
3. Siga as instruções para iOS (se necessário)

#### **Passo 5: Atualizar app.config.js**
```javascript
android: {
  package: "com.buscabuscaimoveis.app",
  googleServicesFile: "./google-services.json"
},
ios: {
  googleServicesFile: "./GoogleService-Info.plist"
}
```

## 🚀 **Status Atual:**

### **✅ Funcionando:**
- Notificações locais agendadas
- Sistema de permissões
- Interface de gerenciamento
- Backend e APIs
- Tokens mock para desenvolvimento

### **⚠️ Precisa Configurar:**
- Firebase para Android (para push notifications reais)
- Arquivo google-services.json

## 🧪 **Para Testar Agora:**

**1. Notificações Locais:**
- ✅ Funcionam perfeitamente
- ✅ Agendadas para 9h, 15h e 21h
- ✅ Aparecem na barra de notificação

**2. Push Notifications:**
- ✅ Backend funciona
- ✅ Tokens são registrados
- ⚠️ Android precisa de Firebase
- ✅ iOS funciona (se configurado)

## 📝 **Resumo:**

**Para desenvolvimento:** Sistema funciona com tokens mock
**Para produção:** Configure Firebase para push notifications Android

**O sistema está funcionando! O erro do Firebase não impede o funcionamento das notificações locais.** 🎉
