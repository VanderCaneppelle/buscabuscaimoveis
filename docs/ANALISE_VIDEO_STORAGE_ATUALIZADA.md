# 📊 Análise Atualizada: Armazenamento de Vídeos (SEM Supabase)

## ⚠️ Problema Confirmado: Supabase Storage

**Você testou e teve problemas reais com chunks!**

Isso é um problema conhecido:
- ❌ TUS protocol tem falhas em arquivos >6MB
- ❌ Chunks não são montados corretamente no servidor
- ❌ Uploads falham ou ficam incompletos
- ❌ Mesmo na versão v3 (50GB) ainda tem problemas

**Referências:**
- [GitHub Issue #563](https://github.com/supabase/storage/issues/563)
- Múltiplos relatos de problemas com resumable uploads

**Conclusão**: ❌ **NÃO usar Supabase Storage para vídeos grandes**

---

## 🎯 Alternativas Viáveis (Ordenadas por Recomendação)

### 🏆 1ª Opção: **Bunny.net** (MELHOR CUSTO-BENEFÍCIO!)

#### Por que Bunny.net é a MELHOR opção para você?

**Preços Competitivos:**
- ✅ Armazenamento: **$0.01/GB/mês**
- ✅ Bandwidth (CDN): **$0.01-0.05/GB** (depende da região)
- ✅ Streaming de vídeo otimizado
- ✅ **SEM limite mínimo** (paga apenas o que usa)

**Exemplo Real para seu Caso:**
```
Cenário: 100GB de vídeos + 100GB de bandwidth
- Armazenamento: 100GB × $0.01 = $1.00/mês
- Bandwidth: 100GB × $0.03 = $3.00/mês
- TOTAL: ~$4-6/mês
```

**Economia vs Cloudinary:** $99 → $6 = **Economia de 94%!** 💰

#### Vantagens Bunny.net

1. ✅ **Upload até 10GB** - Muito além dos 400MB que você precisa
2. ✅ **Chunked upload nativo e ESTÁVEL** - Não tem os problemas do Supabase
3. ✅ **API REST simples** - Fácil de integrar
4. ✅ **CDN global de alta performance** - 14 edge locations
5. ✅ **Streaming adaptativo automático** - HLS/DASH
6. ✅ **Otimização de vídeo automática** - Compressão inteligente
7. ✅ **Upload direto do cliente** - Não precisa passar pelo backend
8. ✅ **Resumable uploads** - Se falhar, retoma de onde parou
9. ✅ **Documentação excelente** - Muito bem documentado

#### Desvantagens Bunny.net

- ⚠️ Menos conhecido que AWS (mas muito confiável)
- ⚠️ Precisa implementar do zero (mas é simples!)

#### Como Funciona o Upload no Bunny.net

```javascript
// 1. Criar upload session (resumable)
const createSession = async (fileName, fileSize) => {
  const response = await fetch('https://video.bunnycdn.com/library/{LIBRARY_ID}/videos', {
    method: 'POST',
    headers: {
      'AccessKey': 'YOUR_API_KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: fileName
    })
  });
  
  const data = await response.json();
  return data.guid; // Video ID
};

// 2. Upload em chunks
const uploadVideo = async (videoId, fileUri) => {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const totalChunks = Math.ceil(fileInfo.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, fileInfo.size);
    
    // Ler chunk
    const chunk = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      position: start,
      length: end - start
    });
    
    // Upload chunk
    await fetch(`https://video.bunnycdn.com/library/{LIBRARY_ID}/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        'AccessKey': 'YOUR_API_KEY',
        'Content-Type': 'application/octet-stream',
        'Content-Range': `bytes ${start}-${end-1}/${fileInfo.size}`
      },
      body: chunk
    });
    
    // Progress
    const progress = Math.round((i + 1) / totalChunks * 100);
    console.log(`Upload progress: ${progress}%`);
  }
  
  return videoId;
};

// 3. Obter URL do vídeo
const getVideoUrl = (videoId) => {
  return `https://iframe.mediadelivery.net/embed/{LIBRARY_ID}/${videoId}`;
};
```

**Tempo de Implementação:** 2-3 dias

---

### 🥈 2ª Opção: **AWS S3 + CloudFront**

#### Preços AWS

**S3 Storage:**
- Armazenamento: **$0.023/GB/mês** (primeiros 50TB)
- PUT requests: $0.005 por 1.000 requisições
- GET requests: $0.0004 por 1.000 requisições

**CloudFront (CDN):**
- Primeiros 10TB: **$0.085/GB**
- 10TB-50TB: $0.080/GB

**Exemplo Real:**
```
Cenário: 100GB storage + 100GB bandwidth
- S3 Storage: 100GB × $0.023 = $2.30/mês
- CloudFront: 100GB × $0.085 = $8.50/mês
- Requests: ~$0.20/mês
- TOTAL: ~$11/mês
```

**Economia vs Cloudinary:** $99 → $11 = **Economia de 89%**

#### Vantagens AWS S3

1. ✅ **Multipart upload nativo e MUITO ESTÁVEL**
2. ✅ **Upload até 5TB** por arquivo
3. ✅ **Infraestrutura mais confiável do mundo**
4. ✅ **Escalabilidade infinita**
5. ✅ **CloudFront = CDN global de alta performance**
6. ✅ **S3 Intelligent-Tiering** - Move arquivos antigos para storage mais barato automaticamente
7. ✅ **Lifecycle policies** - Deleta vídeos antigos automaticamente

#### Desvantagens AWS S3

- ❌ **Complexidade alta de implementação** (1-2 semanas)
- ❌ Precisa configurar IAM, CORS, CloudFront, Signed URLs
- ❌ Requer backend para gerar presigned URLs
- ❌ Curva de aprendizado íngreme

#### Como Funciona (Simplificado)

**Backend (Node.js):**
```javascript
// backend/api/generate-upload-url.js
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export default async function handler(req, res) {
  const { fileName, fileType } = req.body;
  
  // Iniciar multipart upload
  const multipart = await s3.createMultipartUpload({
    Bucket: process.env.AWS_BUCKET,
    Key: `videos/${fileName}`,
    ContentType: fileType
  }).promise();
  
  res.json({
    uploadId: multipart.UploadId,
    key: multipart.Key
  });
}
```

**Frontend (React Native):**
```javascript
// Complexo - precisa gerenciar chunks, ETags, etc.
const uploadVideo = async (fileUri, onProgress) => {
  // 1. Iniciar multipart upload
  const { uploadId, key } = await fetch('/api/generate-upload-url', {
    method: 'POST',
    body: JSON.stringify({ fileName, fileType })
  }).then(r => r.json());
  
  // 2. Dividir arquivo em chunks (mínimo 5MB)
  const chunkSize = 5 * 1024 * 1024;
  const parts = [];
  
  // 3. Upload cada chunk
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    // Obter presigned URL para este chunk
    const presignedUrl = await getPresignedUrl(uploadId, key, partNumber);
    
    // Upload chunk
    const response = await uploadChunk(presignedUrl, chunkData);
    parts.push({
      ETag: response.headers.etag,
      PartNumber: partNumber
    });
  }
  
  // 4. Completar multipart upload
  await completeMultipartUpload(uploadId, key, parts);
};
```

**Tempo de Implementação:** 1-2 semanas

---

### 🥉 3ª Opção: **Backblaze B2 + CDN**

#### Preços Backblaze B2

**Storage:**
- Armazenamento: **$0.005/GB/mês** (50% mais barato que S3!)
- Download: $0.01/GB (primeiros 3× o storage é grátis)
- API calls: Grátis!

**Bunny CDN (para entregar vídeos):**
- $0.01-0.05/GB bandwidth

**Exemplo Real:**
```
Cenário: 100GB storage + 100GB bandwidth
- B2 Storage: 100GB × $0.005 = $0.50/mês
- B2 Download: Grátis (3× storage)
- Bunny CDN: 100GB × $0.03 = $3.00/mês
- TOTAL: ~$3.50/mês
```

**Economia vs Cloudinary:** $99 → $3.50 = **Economia de 96%!** 🎉

#### Vantagens Backblaze B2

1. ✅ **CUSTO MAIS BAIXO** de todas as opções
2. ✅ **API compatível com S3** - Usa mesmas libs
3. ✅ **Upload até 10TB** por arquivo
4. ✅ **Primeiros 3× storage de bandwidth grátis**
5. ✅ **API calls grátis**

#### Desvantagens Backblaze B2

- ❌ Precisa combinar com CDN (Bunny ou CloudFlare)
- ❌ Complexidade similar ao S3
- ⚠️ Menos conhecido

**Tempo de Implementação:** 1-2 semanas (similar ao S3)

---

### 4ª Opção: **Cloudflare R2** (Nova opção!)

#### Preços Cloudflare R2

**Storage:**
- Armazenamento: **$0.015/GB/mês**
- **ZERO cobrança de egress (bandwidth)!** 🎉
- Operações de classe A: $4.50 por milhão
- Operações de classe B: $0.36 por milhão

**Exemplo Real:**
```
Cenário: 100GB storage + 100GB bandwidth
- R2 Storage: 100GB × $0.015 = $1.50/mês
- Egress (bandwidth): $0.00 (GRÁTIS!)
- Operações: ~$0.10/mês
- TOTAL: ~$1.60/mês
```

**Economia vs Cloudinary:** $99 → $1.60 = **Economia de 98%!** 🤯

#### Vantagens Cloudflare R2

1. ✅ **ZERO cobrança de bandwidth** - Economia enorme!
2. ✅ **API compatível com S3**
3. ✅ **CDN Cloudflare incluído** - Um dos melhores CDNs do mundo
4. ✅ **Upload até 5TB** por arquivo
5. ✅ **Mais barato que S3 para alto tráfego**

#### Desvantagens Cloudflare R2

- ⚠️ Relativamente novo (lançado em 2022)
- ❌ Complexidade similar ao S3
- ⚠️ Menos recursos/exemplos disponíveis

**Tempo de Implementação:** 1-2 semanas

---

## 📊 Tabela Comparativa Final (SEM Supabase)

| Serviço | Custo/Mês (100GB) | Upload Chunks | Limite Arquivo | Facilidade | Estabilidade |
|---------|------------------|---------------|----------------|------------|--------------|
| **🏆 Bunny.net** | **$4-6** | ✅ Sim | 10GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cloudflare R2 | $1.60 | ✅ Sim | 5TB | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Backblaze B2 | $3.50 | ✅ Sim | 10TB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| AWS S3 | $11 | ✅ Sim | 5TB | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cloudinary Plus | $99 | ✅ Sim | 2GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Recomendação Final

### 🏆 **Bunny.net** é a MELHOR opção para você!

**Por quê?**

1. ✅ **Custo excelente**: ~$6/mês (94% de economia!)
2. ✅ **Implementação simples**: 2-3 dias (vs 1-2 semanas do AWS)
3. ✅ **Chunked upload estável**: Não tem os problemas do Supabase
4. ✅ **Upload até 10GB**: Muito além dos 400MB
5. ✅ **CDN global incluído**: Performance excelente
6. ✅ **Streaming otimizado**: HLS/DASH automático
7. ✅ **API REST simples**: Fácil de usar em React Native
8. ✅ **Documentação excelente**: Muitos exemplos

### Ordem de Prioridade:

1. **🥇 Bunny.net** - MELHOR equilíbrio custo/facilidade/performance
2. **🥈 Cloudflare R2** - SE você quer economia máxima E tem tempo
3. **🥉 Backblaze B2** - SE você quer o mais barato E tem tempo
4. **4º AWS S3** - SE você precisa do AWS especificamente

---

## 💻 Implementação Bunny.net (Detalhada)

### Passo 1: Criar Conta e Library

1. Acesse [bunny.net](https://bunny.net/)
2. Crie uma conta (trial gratuito)
3. Vá em **Stream > Library > Add Library**
4. Anote:
   - `LIBRARY_ID`
   - `API_KEY`

### Passo 2: Instalar Dependências

```bash
# React Native
npm install react-native-fs
# ou
npm install expo-file-system # se usar Expo
```

### Passo 3: Criar Service

```javascript
// lib/bunnyVideoService.js
import * as FileSystem from 'expo-file-system';

const BUNNY_CONFIG = {
  LIBRARY_ID: 'YOUR_LIBRARY_ID',
  API_KEY: 'YOUR_API_KEY',
  BASE_URL: 'https://video.bunnycdn.com/library'
};

export class BunnyVideoService {
  
  // 1. Criar vídeo (iniciar upload)
  static async createVideo(title) {
    try {
      const response = await fetch(
        `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos`,
        {
          method: 'POST',
          headers: {
            'AccessKey': BUNNY_CONFIG.API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title })
        }
      );
      
      const data = await response.json();
      console.log('✅ Vídeo criado:', data.guid);
      return data.guid; // Video ID
    } catch (error) {
      console.error('❌ Erro ao criar vídeo:', error);
      throw error;
    }
  }
  
  // 2. Upload de vídeo em chunks (RESUMABLE!)
  static async uploadVideo(videoId, fileUri, onProgress) {
    try {
      console.log('🎬 Iniciando upload chunked para Bunny.net...');
      
      // Obter info do arquivo
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = fileInfo.size;
      
      console.log(`📦 Tamanho do arquivo: ${(fileSize / 1024 / 1024).toFixed(2)}MB`);
      
      // Configurar chunks (5MB cada)
      const chunkSize = 5 * 1024 * 1024; // 5MB
      const totalChunks = Math.ceil(fileSize / chunkSize);
      
      console.log(`📦 Total de chunks: ${totalChunks}`);
      
      // Upload cada chunk
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        
        console.log(`📤 Uploading chunk ${chunkIndex + 1}/${totalChunks}...`);
        
        // Ler chunk do arquivo
        const chunkUri = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
          position: start,
          length: end - start
        });
        
        // Converter base64 para blob
        const blob = await fetch(`data:application/octet-stream;base64,${chunkUri}`)
          .then(r => r.blob());
        
        // Upload chunk para Bunny
        const uploadResponse = await fetch(
          `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos/${videoId}`,
          {
            method: 'PUT',
            headers: {
              'AccessKey': BUNNY_CONFIG.API_KEY,
              'Content-Type': 'application/octet-stream',
              'Content-Range': `bytes ${start}-${end-1}/${fileSize}`
            },
            body: blob
          }
        );
        
        if (!uploadResponse.ok) {
          throw new Error(`Chunk ${chunkIndex + 1} upload failed: ${uploadResponse.status}`);
        }
        
        // Atualizar progresso
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} enviado (${progress}%)`);
        
        if (onProgress) {
          onProgress(progress);
        }
      }
      
      console.log('✅ Upload completo!');
      return videoId;
      
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }
  
  // 3. Obter URL do vídeo
  static getVideoUrl(videoId) {
    return `https://iframe.mediadelivery.net/embed/${BUNNY_CONFIG.LIBRARY_ID}/${videoId}`;
  }
  
  // 4. Obter URL de thumbnail
  static getThumbnailUrl(videoId) {
    return `https://vz-${BUNNY_CONFIG.LIBRARY_ID}.b-cdn.net/${videoId}/thumbnail.jpg`;
  }
  
  // 5. Deletar vídeo
  static async deleteVideo(videoId) {
    try {
      const response = await fetch(
        `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos/${videoId}`,
        {
          method: 'DELETE',
          headers: {
            'AccessKey': BUNNY_CONFIG.API_KEY
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      
      console.log('✅ Vídeo deletado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar vídeo:', error);
      throw error;
    }
  }
}
```

### Passo 4: Usar no seu Story Service

```javascript
// lib/storyService.js
import { BunnyVideoService } from './bunnyVideoService';

// No lugar do upload para Cloudinary:
static async uploadStoryVideo(fileUri, title, onProgress) {
  try {
    // 1. Criar vídeo no Bunny
    const videoId = await BunnyVideoService.createVideo(title);
    
    // 2. Upload do arquivo
    await BunnyVideoService.uploadVideo(videoId, fileUri, onProgress);
    
    // 3. Obter URLs
    const videoUrl = BunnyVideoService.getVideoUrl(videoId);
    const thumbnailUrl = BunnyVideoService.getThumbnailUrl(videoId);
    
    console.log('✅ Vídeo enviado:', videoUrl);
    
    return {
      videoUrl,
      thumbnailUrl,
      videoId
    };
    
  } catch (error) {
    console.error('❌ Erro no upload do story:', error);
    throw error;
  }
}
```

---

## 📝 Checklist de Migração

### Preparação (1 dia)
- [ ] Criar conta no Bunny.net
- [ ] Criar Stream Library
- [ ] Obter API Key e Library ID
- [ ] Testar API com Postman/Insomnia

### Implementação (2 dias)
- [ ] Criar `bunnyVideoService.js`
- [ ] Implementar upload chunked
- [ ] Adicionar progress callbacks
- [ ] Testar com vídeo de 400MB
- [ ] Implementar retry logic
- [ ] Adicionar error handling

### Integração (1 dia)
- [ ] Atualizar `storyService.js`
- [ ] Remover código do Cloudinary
- [ ] Testar criação de story
- [ ] Testar reprodução de vídeo
- [ ] Testar em iOS e Android

### Migração de Dados (Opcional)
- [ ] Listar vídeos existentes no Cloudinary
- [ ] Download de cada vídeo
- [ ] Re-upload para Bunny.net
- [ ] Atualizar URLs no banco
- [ ] Deletar do Cloudinary

---

## 🎉 Resultado Final

- ✅ **Economia de ~$90/mês** (94% de redução!)
- ✅ **Upload estável de 400MB** (sem problemas de chunks!)
- ✅ **CDN global de alta performance**
- ✅ **Streaming otimizado automático**
- ✅ **Implementação em 3-4 dias**

---

Quer que eu implemente o Bunny.net para você? 🚀

