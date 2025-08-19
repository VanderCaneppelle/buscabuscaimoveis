# Implementação de Exclusão do Cloudinary

## 🎯 **Visão Geral**

Esta implementação segue as melhores práticas de segurança do Cloudinary, usando o SDK oficial no backend para gerar assinaturas automaticamente.

## 🏗️ **Arquitetura**

### **Frontend (React Native)**
- `lib/storyService.js`: Chama endpoint do backend
- Não contém credenciais sensíveis
- Envia apenas a URL do arquivo

### **Backend (Node.js)**
- `backend/api/delete-cloudinary.js`: Endpoint de exclusão
- `backend/.env`: Credenciais do Cloudinary
- Usa SDK oficial do Cloudinary

## 🔧 **Configuração**

### **1. Backend (.env)**
```env
CLOUDINARY_CLOUD_NAME=djtl3cvkz
CLOUDINARY_API_KEY=846122189452644
CLOUDINARY_API_SECRET=-f6-sCVj9QlSoLnaVa_-7dE6Gu0
```

### **2. Dependências**
```bash
# Backend
cd backend
npm install cloudinary

# Frontend (sem dependências adicionais)
```

## 🔄 **Fluxo de Exclusão**

1. **Frontend**: `StoryService.deleteStory()` é chamado
2. **Frontend**: `deleteFromCloudinary()` chama endpoint `/api/delete-cloudinary`
3. **Backend**: Extrai `public_id` da URL
4. **Backend**: Usa `cloudinary.uploader.destroy()` com SDK oficial
5. **Backend**: Retorna resultado para frontend
6. **Frontend**: Continua com exclusão do banco e Supabase

## 🛡️ **Segurança**

- ✅ **API Secret** nunca exposto no frontend
- ✅ **Assinatura** gerada automaticamente pelo SDK
- ✅ **Credenciais** em variáveis de ambiente
- ✅ **Validação** de permissões no frontend

## 📝 **Exemplo de Uso**

```javascript
// Frontend
await StoryService.deleteStory(storyId, userId);

// Backend (automático)
cloudinary.uploader.destroy(publicId, {
    resource_type: 'video' // ou 'image'
});
```

## 🚀 **Deploy**

1. **Configurar** variáveis de ambiente no servidor
2. **Deploy** do endpoint `/api/delete-cloudinary`
3. **Testar** exclusão completa de stories

## ✅ **Benefícios**

- **Segurança**: Credenciais protegidas
- **Simplicidade**: SDK cuida da assinatura
- **Manutenibilidade**: Código limpo e organizado
- **Confiabilidade**: Usa métodos oficiais do Cloudinary
