# 🐰 Bunny.net - Guia Completo de Configuração e Uso

## 📋 Índice

1. [Criação de Conta](#1-criação-de-conta)
2. [Configuração do Library](#2-configuração-do-library)
3. [Obter Credenciais](#3-obter-credenciais)
4. [Configurar no Projeto](#4-configurar-no-projeto)
5. [Como Usar](#5-como-usar)
6. [Migração do Cloudinary](#6-migração-do-cloudinary)
7. [Testes](#7-testes)

---

## 1. Criação de Conta

### Passo 1: Criar Conta

1. Acesse: https://bunny.net/
2. Clique em **"Sign Up"**
3. Preencha:
   - Email
   - Senha
   - Nome da empresa (opcional)
4. Confirme o email

### Passo 2: Adicionar Método de Pagamento

1. Vá em **Billing** → **Payment Methods**
2. Adicione cartão de crédito
3. **Trial gratuito**: 14 dias grátis (sem cobrança)

---

## 2. Configuração do Library

### Criar Video Library

1. No dashboard, clique em **Stream**
2. Clique em **"Add Library"**
3. Configure:
   - **Name**: Stories (ou o nome que preferir)
   - **Replication Regions**: Escolha regiões próximas aos seus usuários
     - Sugestão para Brasil: **South America** + **North America**
   - **Player**: Deixe padrão (BunnyStream Player)
4. Clique em **"Add Library"**

### Configurações Recomendadas

Após criar, vá em **Settings**:

1. **Storage**:
   - ✅ Enable storage replication
   - Regiões: South America, North America

2. **Security**:
   - ✅ Enable token authentication (opcional, para maior segurança)
   - Se habilitar, anote o token

3. **Upload**:
   - Max file size: **10 GB** (padrão)
   - ✅ Allow resumable uploads

---

## 3. Obter Credenciais

### Library ID

1. No dashboard do Bunny.net
2. Vá em **Stream** → **Your Library**
3. Copie o **Library ID** (UUID)
   - Exemplo: `12345-abcde-67890-fghij`

### API Key

1. No dashboard do Bunny.net
2. Vá em **Stream** → **Your Library** → **API**
3. Copie a **API Key**
   - Exemplo: `abc123-def456-ghi789-jkl012-mno345-pqr678`

---

## 4. Configurar no Projeto

### Opção 1: Variáveis de Ambiente (Recomendado)

**Arquivo: `.env`**

```env
# Bunny.net Stream Credentials
EXPO_PUBLIC_BUNNY_LIBRARY_ID=12345-abcde-67890-fghij
EXPO_PUBLIC_BUNNY_API_KEY=abc123-def456-ghi789-jkl012-mno345-pqr678
EXPO_PUBLIC_BUNNY_STREAM_HOST=vz-xxxxxxxx.b-cdn.net
```

**⚠️ IMPORTANTE:**
- Adicione `.env` ao `.gitignore`
- **NUNCA** commit credenciais no git!

### Opção 2: Hardcode no Arquivo (Apenas para teste)

**Arquivo: `lib/bunnyVideoService.js`**

```javascript
const BUNNY_CONFIG = {
    LIBRARY_ID: '12345-abcde-67890-fghij', // Seu Library ID
    API_KEY: 'abc123-def456-ghi789...', // Sua API Key
    BASE_URL: 'https://video.bunnycdn.com/library',
    CDN_URL: 'https://iframe.mediadelivery.net/embed'
};
```

---

## 5. Como Usar

### 5.1 Importar o Serviço

```javascript
import { BunnyVideoService } from '../lib/bunnyVideoService';
```

### 5.2 Upload Simples (Automático)

O serviço realiza **upload direto em uma única requisição PUT**, suportando arquivos de até 10GB.

```javascript
// Upload completo (criar + upload + URLs)
const result = await BunnyVideoService.uploadComplete(
    videoUri,  // URI local do vídeo
    'Meu Story',  // Título
    (progress) => {  // Callback de progresso
        console.log(`Progresso: ${progress}%`);
        setUploadProgress(progress);
    }
);

console.log('✅ Upload completo!');
console.log('Video ID:', result.videoId);
console.log('Video URL:', result.videoUrl);
console.log('Thumbnail:', result.thumbnailUrl);
console.log('Método:', result.method); // 'direct'
```

### 5.3 Upload Manual (Passo a Passo)

```javascript
// 1. Criar vídeo
const { videoId } = await BunnyVideoService.createVideo('Título do Vídeo');

// 2. Upload do arquivo
const result = await BunnyVideoService.uploadVideo(
    videoId,
    videoUri,
    (progress) => console.log(`${progress}%`)
);

// 3. Obter URLs
const videoUrl = BunnyVideoService.getVideoUrl(videoId);
const thumbnailUrl = BunnyVideoService.getThumbnailUrl(videoId);

console.log('Video URL:', videoUrl);
console.log('Thumbnail:', thumbnailUrl);
```

### 5.4 Gerenciar Vídeos

```javascript
// Obter informações do vídeo
const info = await BunnyVideoService.getVideoInfo(videoId);
console.log('Info:', info);

// Deletar vídeo
await BunnyVideoService.deleteVideo(videoId);
```

---

## 6. Migração do Cloudinary

### 6.1 Criar Método Híbrido (Recomendado)

Crie um método que tenta Bunny.net primeiro, com fallback para Cloudinary:

```javascript
// lib/mediaServiceOptimized.js

static async uploadStoryWithBunny(fileUri, title, mediaType, onProgress = null, ...otherParams) {
    try {
        console.log('🐰 Tentando upload com Bunny.net...');
        
        // Tentar Bunny.net
        const result = await BunnyVideoService.uploadComplete(
            fileUri,
            title,
            onProgress
        );
        
        console.log('✅ Upload via Bunny.net concluído!');
        
        // Continuar com thumbnail e banco de dados
        let thumbnailUrl = result.thumbnailUrl;
        
        // Salvar no banco
        const dbResult = await this.saveStoryToDatabase(
            result.videoUrl,
            title,
            mediaType,
            thumbnailUrl,
            ...otherParams
        );
        
        return {
            publicUrl: result.videoUrl,
            thumbnailUrl: thumbnailUrl,
            orderIndex: dbResult.orderIndex,
            success: true,
            method: 'bunny',
            videoId: result.videoId
        };
        
    } catch (error) {
        console.warn('⚠️ Bunny.net falhou, usando Cloudinary como fallback...');
        console.error('Erro Bunny:', error);
        
        // Fallback para Cloudinary
        return await this.uploadStory(fileUri, title, mediaType, onProgress, ...otherParams);
    }
}
```

### 6.2 Atualizar CreateStoryScreen

```javascript
// components/CreateStoryScreen.js

// Substituir linha 276:
const result = await MediaService.uploadStoryWithBunny(
    capturedMedia.uri,
    storyTitle || null,
    capturedMedia.type,
    (progress) => {
        console.log(`📤 Progresso: ${progress}%`);
        setUploadProgress(progress);
    },
    linkData,
    'custom',
    titleCoordinates,
    titleLayout,
    titleScale,
    linkScale,
    user?.id
);
```

### 6.3 Migração Gradual

**Fase 1: Teste (Agora)**
- ✅ Bunny.net como principal
- ✅ Cloudinary como fallback
- ✅ Monitorar logs

**Fase 2: Validação (Após 1 semana)**
- ✅ Verificar taxa de sucesso Bunny.net
- ✅ Verificar performance (tempo de upload)
- ✅ Verificar custos reais

**Fase 3: Migração Completa (Após validação)**
- ✅ Remover código Cloudinary
- ✅ Desativar conta Cloudinary
- ✅ **Economia: $93/mês** 💰

---

## 7. Testes

### 7.1 Teste Básico

```javascript
// Teste simples de upload
const testUpload = async () => {
    try {
        const videoUri = 'file:///path/to/video.mp4';
        
        const result = await BunnyVideoService.uploadComplete(
            videoUri,
            'Teste Upload',
            (progress) => console.log(`${progress}%`)
        );
        
        console.log('✅ Teste passou!');
        console.log('Video URL:', result.videoUrl);
        
    } catch (error) {
        console.error('❌ Teste falhou:', error);
    }
};
```

### 7.2 Cenários de Teste

| Cenário | Tamanho | Método Esperado | Status |
|---------|---------|-----------------|--------|
| Vídeo pequeno | 50MB | Direct | [ ] |
| Vídeo médio | 150MB | Direct | [ ] |
| Vídeo grande | 300MB | Direct | [ ] |
| Vídeo muito grande | 500MB | Direct | [ ] |

### 7.3 Checklist de Teste

**Funcionalidade:**
- [ ] Upload de vídeo <100MB
- [ ] Upload de vídeo ≥100MB (direto)
- [ ] Progress callback funciona
- [ ] URL do vídeo é retornada
- [ ] Thumbnail é gerado
- [ ] Vídeo reproduz corretamente
- [ ] Retry automático funciona

**Performance:**
- [ ] Tempo de upload aceitável
- [ ] Conexão estável (WiFi)
- [ ] Conexão estável (4G)
- [ ] Consumo de memória OK
- [ ] App não trava durante upload

**Plataformas:**
- [ ] iOS
- [ ] Android

---

## 8. Monitoramento

### 8.1 Dashboard Bunny.net

Acesse: https://dash.bunny.net/

**Métricas Importantes:**
- **Storage**: Espaço usado
- **Bandwidth**: Tráfego de vídeos
- **Request Count**: Número de requisições
- **Costs**: Custos acumulados

### 8.2 Logs no App

Os logs do `BunnyVideoService` incluem:

```
🐰 [Bunny] Criando vídeo: Título
✅ [Bunny] Vídeo criado: video-id-123
🎯 Método: DIRECT UPLOAD (1 requisição)
📤 [Bunny] Upload direto iniciado...
📊 Progresso: 35%
📊 Progresso: 72%
📊 Progresso: 100%
✅ [Bunny] Upload direto concluído!
```

---

## 9. Custos Estimados

### Cenário Real: 1.000 stories/mês

**Armazenamento:**
- 1.000 vídeos × 150MB (média) = 150GB
- Custo: 150GB × $0.01 = **$1.50/mês**

**Bandwidth:**
- 10.000 views × 150MB = 1.5TB
- Custo: 1.5TB × 1024GB × $0.03 = **$46/mês**

**Total: ~$47.50/mês**

### Comparação

| Serviço | Custo/Mês | Economia |
|---------|-----------|----------|
| Cloudinary | $99 | - |
| Bunny.net | $47.50 | 52% |
| **Diferença** | - | **$51.50/mês** |

**Economia anual: $618** 🎉

---

## 10. Troubleshooting

### Erro: "BUNNY_CONFIG não configurado"

**Causa**: Credenciais não foram configuradas

**Solução**:
1. Configure `.env` com suas credenciais
2. Ou edite `lib/bunnyVideoService.js` diretamente

### Erro: "401 Unauthorized"

**Causa**: API Key inválida

**Solução**:
1. Verifique se copiou a API Key correta
2. Regenere a API Key se necessário

### Erro: "404 Not Found"

**Causa**: Library ID incorreto

**Solução**:
1. Verifique o Library ID no dashboard
2. Certifique-se que o library existe

### Erro: "Upload falhou" (status 4xx/5xx)

**Causa**: Conexão instável ou interrupção na requisição PUT

**Solução**:
1. Verifique conexão de internet
2. Tente em WiFi estável
3. Caso persista, gere um novo vídeo (novo `videoId`) e tente novamente

### Upload Lento

**Possíveis causas:**
- Conexão lenta do usuário
- Região do library distante
- Arquivo muito grande

**Soluções:**
- Use replicação em múltiplas regiões
- Considere compressão de vídeo antes do upload

---

## 11. FAQ

### Bunny.net suporta vídeos ao vivo?

Sim, mas requer configuração adicional. Para stories, use apenas upload de vídeos gravados.

### Posso usar Bunny.net para imagens?

Sim, mas o serviço atual é otimizado para vídeos. Para imagens, mantenha Supabase/Cloudinary.

### Como deletar vídeos antigos automaticamente?

Configure um cron job que:
1. Lista vídeos com >30 dias
2. Chama `BunnyVideoService.deleteVideo(videoId)`

### Bunny.net tem CDN global?

Sim! Bunny.net tem edge servers em todo mundo, garantindo entrega rápida.

### E se eu ultrapassar o limite do plano?

Bunny.net é pay-as-you-go. Sem limites rígidos, você paga pelo que usar.

---

## 12. Suporte

### Documentação Oficial
- https://docs.bunny.net/docs/stream

### Suporte Bunny.net
- Email: support@bunny.net
- Discord: https://bunny.net/discord

### Suporte do Projeto
- Verificar logs em `lib/bunnyVideoService.js`
- Todos os erros são logados com `console.error`

---

## ✅ Próximos Passos

1. [ ] Criar conta no Bunny.net
2. [ ] Obter Library ID e API Key
3. [ ] Configurar `.env`
4. [ ] Testar upload com vídeo pequeno
5. [ ] Testar upload com vídeo grande (>100MB)
6. [ ] Implementar método híbrido
7. [ ] Monitorar por 1 semana
8. [ ] Migrar completamente
9. [ ] Cancelar Cloudinary
10. [ ] 🎉 Economizar $93/mês!

---

**Dúvidas? Veja os logs detalhados ou entre em contato!** 🚀

