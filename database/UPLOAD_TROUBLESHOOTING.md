# 🔧 Guia de Solução de Problemas - Upload de Mídia

## 🚨 Problemas Comuns e Soluções

### 1. **Erro de Memória (OutOfMemoryError)**

**Sintoma:**
```
java.lang.OutOfMemoryError: Failed to allocate a 260202248 byte allocation
```

**Causa:** Arquivo muito grande sendo carregado na memória como base64.

**Soluções:**
- ✅ **Implementado:** Upload direto sem conversão base64
- ✅ **Implementado:** Limite de 25MB por arquivo
- ✅ **Implementado:** Qualidade reduzida para vídeos (0.5) e imagens (0.7)
- ✅ **Implementado:** Duração máxima de vídeo reduzida para 30 segundos

### 2. **Arquivo Muito Grande**

**Sintoma:**
```
Arquivo muito grande. Máximo permitido: 50MB
```

**Soluções:**
- 📱 **No app:** Reduzir qualidade antes de selecionar
- 📱 **No app:** Usar vídeos mais curtos (máximo 30s)
- 📱 **No app:** Comprimir imagens antes do upload
- ⚠️ **Aviso:** Arquivos > 25MB mostram confirmação antes do upload

### 3. **Falha no Upload**

**Sintoma:**
```
Erro no upload: [Error: Call to function 'ExponentFileSystem.readAsStringAsync' has been rejected]
```

**Soluções:**
- 🔄 **Reiniciar o app** após fechar completamente
- 🔄 **Limpar cache** do Expo: `npx expo start --clear`
- 🔄 **Verificar conexão** de internet
- 🔄 **Tentar arquivo menor** primeiro

### 4. **Erro de MIME Type**

**Sintoma:**
```
StorageApiError: mime type text/plain;charset=UTF-8 is not supported
```

**Soluções:**
- ✅ **Implementado:** MIME type correto detectado automaticamente
- ✅ **Implementado:** Fallback para `image/jpeg` se extensão não reconhecida
- ✅ **Implementado:** Limpeza de extensões de arquivo
- ✅ **Implementado:** Conversão correta para Blob antes do upload
- ✅ **Implementado:** Upload específico para vídeos usando fetch
- 🔄 **Se persistir:** Verificar se arquivo tem extensão válida

### 5. **Erro de Rede (Network Request Failed)**

**Sintoma:**
```
StorageUnknownError: Network request failed
```

**Soluções:**
- ✅ **Implementado:** Verificação de conectividade antes do upload
- ✅ **Implementado:** Sistema de retry automático (3 tentativas)
- ✅ **Implementado:** Mensagens de erro específicas para problemas de rede
- ✅ **Implementado:** Verificação específica para vídeos
- ✅ **Implementado:** Logs detalhados para debug
- ✅ **Implementado:** Delay aumentado entre tentativas (2s)
- 🔄 **Se persistir:** 
  - Verificar conexão de internet
  - Tentar em horários diferentes
  - Verificar se o Supabase está funcionando
  - Executar script de teste de conectividade

## 📋 Configurações Otimizadas

### **Limites Implementados:**
- 🖼️ **Imagens:** Máximo 50MB, qualidade 0.7
- 🎥 **Vídeos:** Máximo 50MB, qualidade 0.5, 30s máximo
- 📁 **Total:** Máximo 10 arquivos por anúncio
- ⚠️ **Aviso:** Arquivos > 25MB mostram aviso antes do upload
- 🚫 **Bloqueio:** Arquivos > 50MB são bloqueados automaticamente

### **Estratégias de Upload:**
- 🎥 **Vídeos iOS:** Upload via fetch + blob
- 🎥 **Vídeos Android < 10MB:** Upload direto via FileSystem + Uint8Array
- 🎥 **Vídeos Android > 10MB:** Upload em chunks (2MB por chunk)
- 🖼️ **Imagens < 5MB:** Upload direto via FileSystem
- 🖼️ **Imagens > 5MB:** Upload em chunks (1MB por chunk)

## 🛠️ Como Usar

### **1. Para Imagens:**
```javascript
// Qualidade otimizada automaticamente
const image = await MediaService.pickImage();
```

### **2. Para Vídeos:**
```javascript
// Duração e qualidade limitadas automaticamente
const video = await MediaService.pickVideo();
```

### **3. Para Fotos da Câmera:**
```javascript
// Qualidade otimizada automaticamente
const photo = await MediaService.takePhoto();
```

## 🔍 Verificação de Problemas

### **1. Verificar Tamanho do Arquivo:**
```javascript
const fileInfo = await FileSystem.getInfoAsync(fileUri);
console.log(`Tamanho: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
```

### **2. Verificar Memória Disponível:**
```javascript
// No Android, verificar memória disponível
import { Platform } from 'react-native';
if (Platform.OS === 'android') {
    // O sistema automaticamente gerencia memória
}
```

## 📱 Dicas para o Usuário

### **Antes de Fazer Upload:**
1. **Feche outros apps** para liberar memória
2. **Use Wi-Fi** para uploads grandes
3. **Selecione arquivos menores** primeiro
4. **Evite vídeos muito longos** (>30s)

### **Se o Upload Falhar:**
1. **Tente novamente** após alguns segundos
2. **Reduza o tamanho** do arquivo
3. **Reinicie o app** se necessário
4. **Verifique a conexão** de internet

## 🔧 Configurações do Supabase Storage

### **Bucket Configurado:**
- 📁 **Nome:** `properties`
- 📏 **Limite:** 50MB por arquivo
- 🔒 **Acesso:** Público para leitura
- 👤 **Upload:** Apenas usuários autenticados

### **Políticas RLS:**
```sql
-- Usuários autenticados podem fazer upload
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'properties' AND auth.role() = 'authenticated');

-- Arquivos são públicos para visualização
CREATE POLICY "Arquivos são públicos" ON storage.objects
    FOR SELECT USING (bucket_id = 'properties');
```

## 🚀 Próximas Melhorias

### **Planejadas:**
- 📊 **Progress bar** para uploads grandes
- 🔄 **Retry automático** em caso de falha
- 📱 **Compressão automática** de imagens
- 🎥 **Conversão automática** de vídeos
- 💾 **Cache local** para arquivos recentes

### **Implementadas:**
- ✅ Upload direto sem base64
- ✅ Limites de tamanho e qualidade
- ✅ Upload em chunks para arquivos grandes
- ✅ Verificação de permissões
- ✅ Tratamento de erros robusto
- ✅ API atualizada (sem warnings deprecated)
- ✅ Sintaxe correta: `mediaTypes: ['images']` e `mediaTypes: ['videos']`
- ✅ MIME type correto detectado automaticamente
- ✅ Validação de tamanho antes do upload
- ✅ Bloqueio de arquivos > 50MB
- ✅ Conversão correta para Blob antes do upload
- ✅ Sistema de retry automático para problemas de rede
- ✅ Verificação de conectividade antes do upload
- ✅ Upload específico para vídeos (fetch) e imagens (FileSystem)
- ✅ Vídeos sempre usam fetch (evita problemas de MIME type)
- ✅ Upload específico por plataforma (iOS vs Android)
- ✅ Upload em chunks para vídeos grandes no Android (2MB por chunk) 