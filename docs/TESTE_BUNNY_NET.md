# 🐰 Teste Rápido - Bunny.net Upload

## ✅ Credenciais Configuradas

- **Library ID**: 533844
- **API Key**: de277d9a-9871-4c13-8c533dd056f8-28f5-4f35
- **CDN**: vz-13c78ad2-bb6.b-cdn.net

---

## 🧪 Teste 1: Upload Simples

### Criar arquivo de teste temporário:

```javascript
// teste-bunny-upload.js
import { BunnyVideoService } from "./lib/bunnyVideoService";

export async function testarBunnyUpload(videoUri) {
    console.log("═══════════════════════════════════════");
    console.log("🧪 TESTE BUNNY.NET - Upload");
    console.log("═══════════════════════════════════════");

    try {
        const startTime = Date.now();

        const result = await BunnyVideoService.uploadComplete(
            videoUri,
            `Teste ${Date.now()}`,
            (progress) => {
                console.log(`📊 Progresso: ${progress}%`);
            },
        );

        const duration = (Date.now() - startTime) / 1000;

        console.log("═══════════════════════════════════════");
        console.log("✅ TESTE CONCLUÍDO!");
        console.log("═══════════════════════════════════════");
        console.log(`⏱️ Tempo: ${duration.toFixed(2)}s`);
        console.log(`🆔 Video ID: ${result.videoId}`);
        console.log(`🔗 Video URL: ${result.videoUrl}`);
        console.log(`🖼️ Thumbnail: ${result.thumbnailUrl}`);
        console.log(`🎯 Método: ${result.method}`);

        return result;
    } catch (error) {
        console.error("❌ TESTE FALHOU:", error);
        throw error;
    }
}
```

---

## 🎯 Teste 2: Integrar no CreateStoryScreen

### Método Híbrido (Bunny.net + Fallback Cloudinary):

```javascript
// lib/mediaServiceOptimized.js

// Adicionar novo método após uploadStory():

/**
 * Upload de story com Bunny.net (com fallback para Cloudinary)
 */
static async uploadStoryWithBunny(
    fileUri, 
    title, 
    mediaType, 
    onProgress, 
    linkData, 
    titlePosition, 
    titleCoordinates, 
    titleLayout, 
    titleScale, 
    linkScale, 
    userId
) {
    try {
        console.log('🐰 Tentando upload com Bunny.net...');
        
        // Importar BunnyVideoService
        const { BunnyVideoService } = require('./bunnyVideoService');
        
        // Detectar tipo de mídia se não fornecido
        if (!mediaType) {
            const fileExtension = fileUri.split('.').pop()?.toLowerCase();
            const mimeType = this.getMimeType(fileExtension);
            mediaType = mimeType.startsWith('video/') ? 'video' : 'image';
        }
        
        // Upload para Bunny.net
        const result = await BunnyVideoService.uploadComplete(
            fileUri,
            title || `Story ${Date.now()}`,
            onProgress
        );
        
        console.log('✅ Upload Bunny.net concluído!');
        
        // Gerar thumbnail local (Bunny.net já gera, mas fazer backup)
        let localThumbnail = result.thumbnailUrl;
        if (mediaType === 'video') {
            try {
                const thumbnailUri = await this.generateVideoThumbnail(fileUri);
                // Upload thumbnail para Supabase como backup
                localThumbnail = await this.uploadToSupabase(
                    thumbnailUri,
                    'stories',
                    'thumbnails',
                    null
                );
            } catch (thumbError) {
                console.warn('⚠️ Erro ao gerar thumbnail local, usando do Bunny:', thumbError);
            }
        }
        
        // Salvar no banco
        const dbResult = await this.saveStoryToDatabase(
            result.videoUrl,
            title,
            mediaType,
            localThumbnail || result.thumbnailUrl,
            linkData?.url,
            linkData?.text,
            linkData?.position,
            titlePosition,
            linkData?.coordinates,
            titleCoordinates,
            titleLayout,
            titleScale,
            linkScale,
            userId
        );
        
        return {
            publicUrl: result.videoUrl,
            thumbnailUrl: localThumbnail || result.thumbnailUrl,
            orderIndex: dbResult.orderIndex,
            success: true,
            method: 'bunny',
            videoId: result.videoId
        };
        
    } catch (error) {
        console.warn('⚠️ Bunny.net falhou, usando Cloudinary como fallback...');
        console.error('Erro Bunny:', error.message);
        
        // Fallback para Cloudinary
        return await this.uploadStory(
            fileUri,
            title,
            mediaType,
            onProgress,
            linkData,
            titlePosition,
            titleCoordinates,
            titleLayout,
            titleScale,
            linkScale,
            userId
        );
    }
}
```

---

## 🔄 Atualizar CreateStoryScreen.js

```javascript
// components/CreateStoryScreen.js
// Linha ~276

// EM VEZ DE:
const result = await MediaService.uploadStory(...)

// USAR:
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

---

## 📊 Logs Esperados

### Upload Pequeno (<100MB):

```
🐰 Tentando upload com Bunny.net...
🐰 [Bunny] Criando vídeo: Teste 1730901234567
✅ [Bunny] Vídeo criado: abc123-def456
🎯 Método: DIRECT UPLOAD (<100MB)
📤 [Bunny] Upload direto iniciado...
📤 Enviando arquivo...
✅ [Bunny] Upload direto concluído
═══════════════════════════════════════
✅ Upload Completo!
═══════════════════════════════════════
🆔 Video ID: abc123-def456
🔗 Video URL: https://iframe.mediadelivery.net/embed/533844/abc123-def456
🖼️ Thumbnail: https://vz-533844.b-cdn.net/abc123-def456/thumbnail.jpg
🎯 Método: direct
```

### Upload Grande (≥100MB):

```
🐰 Tentando upload com Bunny.net...
🐰 [Bunny] Criando vídeo: Teste 1730901234567
✅ [Bunny] Vídeo criado: xyz789-ghi012
📦 Tamanho: 240.00MB
🎯 Método: DIRECT UPLOAD (até 10GB)
📤 [Bunny] Upload direto iniciado...
📊 Progresso: 5%
📊 Progresso: 22%
📊 Progresso: 47%
📊 Progresso: 71%
📊 Progresso: 100%
✅ [Bunny] Upload direto concluído
✅ Upload Completo!
```

---

## ⚠️ Se Bunny.net Falhar

O método híbrido automaticamente usa Cloudinary:

```
⚠️ Bunny.net falhou, usando Cloudinary como fallback...
Erro Bunny: Network request failed
🎬 Iniciando upload com Cloudinary...
... (continua com Cloudinary)
```

---

## ✅ Checklist de Teste

- [ ] Configurar credenciais no `.env`
- [ ] Testar upload de vídeo pequeno (50MB)
- [ ] Testar upload de vídeo grande (200MB)
- [ ] Verificar se vídeo aparece no dashboard Bunny.net
- [ ] Verificar se vídeo reproduz na URL gerada
- [ ] Verificar se thumbnail é gerado
- [ ] Testar fallback (desconectar internet temporariamente)
- [ ] Comparar custos no dashboard

---

## 🎯 URLs Importantes

- **Dashboard**: https://dash.bunny.net/stream/533844
- **Documentação API**: https://docs.bunny.net/reference/video_createvideo
- **Seus vídeos**: https://dash.bunny.net/stream/533844/manage

---

## 💡 Próximos Passos

1. ✅ Credenciais configuradas
2. ✅ Método `uploadStoryWithBunny` adicionado
3. ✅ `CreateStoryScreen.js` atualizado
4. ⏳ **Configurar .env (VOCÊ PRECISA FAZER AGORA)**
5. ⏳ Fazer primeiro teste
6. ⏳ Monitorar por 1 semana
7. ⏳ Cancelar Cloudinary

---

## 🎯 FAÇA AGORA: Configurar .env

### Opção 1: Criar novo arquivo .env

Se você NÃO tem um arquivo `.env`, crie na raiz:

```bash
# Criar novo .env
touch .env
```

### Opção 2: Editar .env existente

Se você JÁ tem um arquivo `.env`, abra-o e adicione no final:

```env
# Bunny.net Stream (para vídeos)
EXPO_PUBLIC_BUNNY_LIBRARY_ID=533844
EXPO_PUBLIC_BUNNY_API_KEY=de277d9a-9871-4c13-8c533dd056f8-28f5-4f35
EXPO_PUBLIC_BUNNY_STREAM_HOST=vz-13c78ad2-bb6.b-cdn.net
```

### 🔄 Reiniciar Expo

Depois de salvar o `.env`:

```bash
# Parar o Expo (Ctrl+C)
# Reiniciar:
npx expo start --clear
```

---

**Pronto para testar! 🚀**
