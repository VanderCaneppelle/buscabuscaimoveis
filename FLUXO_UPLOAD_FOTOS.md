# 📸 Fluxo de Upload de Fotos na Criação de Anúncios

## 📋 Visão Geral

Este documento descreve o fluxo completo de upload de fotos quando um usuário cria um novo anúncio de imóvel.

---

## 🔄 Fluxo Completo

### 1️⃣ **Seleção de Fotos (UI)**

**Arquivo:** `components/wizard/steps/Step8Media.js`

- O usuário clica no botão "Adicionar fotos" (linha 177)
- Abre o modal `MediaUploadModal` (linha 265-273)

```177:177:components/wizard/steps/Step8Media.js
                            onPress={() => setShowUploadModal(true)}
```

---

### 2️⃣ **Modal de Seleção**

**Arquivo:** `components/wizard/modals/MediaUploadModal.js`

O modal oferece 3 opções:

#### **a) Tirar Foto (Câmera)**
- Função: `takePhoto()` (linha 106)
- Chama: `ImagePicker.launchCameraAsync()` (linha 119)
- Cria objeto: `{ uri, type: 'image', width, height }` (linha 126-131)
- Adiciona ao array: `setMediaFiles([...mediaFiles, ...])` (linha 126)

#### **b) Selecionar da Galeria**
- Função: `pickImages()` (linha 31)
- Chama: `ImagePicker.launchImageLibraryAsync()` (linha 46)
- Permite múltipla seleção: `allowsMultipleSelection: true` (linha 48)
- Limite baseado no plano: `selectionLimit: remainingSlots` (linha 50)
- Cria array de objetos: `result.assets.map(...)` (linha 54-59)
- Adiciona ao array: `setMediaFiles([...mediaFiles, ...newImages])` (linha 61)

#### **c) Vídeo** (não usado para fotos)
- Função: `pickVideo()` (linha 70)
- Similar ao pickImages, mas para vídeos

**Resultado:** As fotos selecionadas são armazenadas no estado `mediaFiles` do componente pai (`CreateAdWizard`)

---

### 3️⃣ **Submissão do Formulário**

**Arquivo:** `components/CreateAdWizard.js`

Quando o usuário finaliza o wizard e clica em "Publicar":

- Função: `handleSubmit()` (linha 234)
- Valida limites de mídia: `validateMediaLimitsByPlan()` (linha 250)
- Prepara dados: `propertyData` (linha 263-268)
- Chama: `PropertyService.createProperty()` (linha 282)

```282:282:components/CreateAdWizard.js
            const newProperty = await PropertyService.createProperty(propertyData, mediaFiles, onUploadProgress, videoUrls);
```

**Parâmetros passados:**
- `propertyData`: Dados do imóvel (título, preço, localização, etc.)
- `mediaFiles`: Array de objetos `{ uri, type, width, height }` das fotos selecionadas
- `onUploadProgress`: Callback para atualizar barra de progresso
- `videoUrls`: Array de URLs do YouTube (se houver)

---

### 4️⃣ **Upload das Fotos**

**Arquivo:** `lib/propertyService.js`

- Função: `PropertyService.createProperty()` (linha 54)

**Passo 4.1: Upload das mídias**
```54:60:lib/propertyService.js
    static async createProperty(propertyData, mediaFiles = [], onProgress = null, videoUrls = []) {
        try {
            // Upload das mídias primeiro (apenas fotos agora)
            let mediaUrls = [];
            if (mediaFiles.length > 0) {
                mediaUrls = await MediaService.uploadMultipleFiles(mediaFiles, 'properties', 'media', onProgress);
            }
```

Chama: `MediaService.uploadMultipleFiles()` (que é um alias para `MediaServiceOptimized.uploadMultipleFiles`)

---

### 5️⃣ **Upload Múltiplo de Arquivos**

**Arquivo:** `lib/mediaServiceOptimized.js`

- Função: `uploadMultipleFiles()` (linha 594)

**O que faz:**
1. Itera sobre cada arquivo no array `files` (linha 598)
2. Para cada arquivo:
   - Verifica tamanho (máx. 500MB) (linha 604-609)
   - Calcula progresso individual (linha 612-615)
   - Chama `uploadToSupabase()` para cada arquivo (linha 617)
   - Adiciona URL retornada ao array `uploadedUrls` (linha 618)
3. Retorna array de URLs (linha 626)

```594:631:lib/mediaServiceOptimized.js
    static async uploadMultipleFiles(files, bucket = 'properties', folder = 'media', onProgress = null) {
        try {
            const uploadedUrls = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`📤 Enviando arquivo ${i + 1}/${files.length}: ${file.fileName || file.uri}`);

                try {
                    // Verificar tamanho individual
                    const fileInfo = await FileSystem.getInfoAsync(file.uri);
                    const maxSize = 500 * 1024 * 1024; // 500MB (atualizado)

                    if (fileInfo.size > maxSize) {
                        throw new Error(`Arquivo ${i + 1} muito grande. Máximo: 500MB. Tamanho: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
                    }

                    // Criar callback de progresso para cada arquivo
                    const fileProgress = onProgress ? (progress) => {
                        const totalProgress = Math.round(((i + progress / 100) / files.length) * 100);
                        onProgress(totalProgress);
                    } : null;

                    const url = await this.uploadToSupabase(file.uri, bucket, folder, fileProgress);
                    uploadedUrls.push(url);
                    console.log(`✅ Arquivo ${i + 1} enviado com sucesso`);
                } catch (error) {
                    console.error(`❌ Erro no upload do arquivo ${i + 1}:`, error);
                    throw error;
                }
            }

            return uploadedUrls;
        } catch (error) {
            console.error('Erro no upload múltiplo:', error);
            throw error;
        }
    }
```

---

### 6️⃣ **Upload Individual (uploadToSupabase)**

**Arquivo:** `lib/mediaServiceOptimized.js`

- Função: `uploadToSupabase()` (linha 142)

**O que faz:**
1. Verifica conectividade (linha 145)
2. Gera nome único do arquivo: `folder/timestamp-random.ext` (linha 148)
3. Detecta tipo MIME (linha 155)
4. **Decisão importante:**
   - Se for **vídeo**: chama `uploadVideoWithFetch()` (linha 160)
   - Se for **imagem**: chama `uploadImageToCloudinary()` (linha 163)

```142:170:lib/mediaServiceOptimized.js
    static async uploadToSupabase(fileUri, bucket = 'properties', folder = 'media', onProgress = null) {
        try {
            // Verificar conectividade primeiro
            await this.checkConnectivity();

            const fileExtension = fileUri.split('.').pop() || 'jpg';
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);


            // Verificar se é vídeo primeiro
            const mimeType = this.getMimeType(fileExtension);
            const isVideo = mimeType.startsWith('video/');

            if (isVideo) {
                // Para vídeos, sempre usar fetch independente do tamanho
                return await this.uploadVideoWithFetch(fileUri, fileName, bucket, mimeType, onProgress);
            } else {

                return await this.uploadImageToCloudinary(fileUri, fileName, mimeType, onProgress);
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            throw error;
        }
    }
```

---

### 7️⃣ **Upload para Cloudinary (Fotos)**

**Arquivo:** `lib/mediaServiceOptimized.js`

- Função: `uploadImageToCloudinary()` (linha 471)

**O que faz:**
1. Cria `FormData` com o arquivo (linha 475-480)
2. Adiciona `upload_preset: "stories"` (linha 481)
3. Faz requisição POST via `XMLHttpRequest` para Cloudinary (linha 483-512)
4. Retorna objeto com `secure_url` (linha 496-498)

```471:518:lib/mediaServiceOptimized.js
    static async uploadImageToCloudinary(fileUri, fileName, mimeType, onProgress = null) {
        try {
            console.log("🖼️ Iniciando upload de imagem para Cloudinary...");

            const data = new global.FormData();
            data.append("file", {
                uri: fileUri,
                type: mimeType,
                name: fileName,
            });
            data.append("upload_preset", "stories"); // seu preset UNSIGNED

            const xhr = new XMLHttpRequest();
            xhr.open(
                "POST",
                "https://api.cloudinary.com/v1_1/djtl3cvkz/image/upload"
            );

            return new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status !== 200) {
                        console.error("❌ Erro no upload de imagem:", xhr.responseText);
                        reject(xhr.responseText);
                        return;
                    }
                    const response = JSON.parse(xhr.responseText);
                    console.log("✅ Upload de imagem concluído:", response);
                    resolve(response);
                };

                xhr.onerror = () => reject(new Error("Erro de rede no upload de imagem"));

                if (onProgress) {
                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const progress = Math.round((event.loaded / event.total) * 100);
                            onProgress(progress);
                        }
                    };
                }

                xhr.send(data);
            });
        } catch (error) {
            console.error("❌ Erro no upload de imagem:", error);
            throw error;
        }
    }
```

**Endpoint Cloudinary:**
- URL: `https://api.cloudinary.com/v1_1/djtl3cvkz/image/upload`
- Preset: `"stories"` (unsigned upload preset)

**Retorno:**
- Objeto Cloudinary com propriedades como `secure_url`, `public_id`, etc.

---

### 8️⃣ **Salvando no Banco de Dados**

**Arquivo:** `lib/propertyService.js`

Após o upload bem-sucedido:

1. Extrai URLs das imagens: `mediaUrls.map(url => url.secure_url)` (linha 91)
2. Prepara objeto `property` com todas as informações (linha 69-94)
3. Insere no Supabase: `supabase.from('properties').insert(property)` (linha 116-120)

```69:94:lib/propertyService.js
            const property = {
                user_id: propertyData.user_id,
                title: propertyData.title,
                description: propertyData.description || null,
                price: parseFloat(propertyData.price),
                sale_price: propertyData.salePrice != null && propertyData.salePrice !== ''
                    ? parseFloat(propertyData.salePrice)
                    : null,
                property_type: propertyData.propertyType, // Corrigido: camelCase -> snake_case
                transaction_type: propertyData.transactionType, // Corrigido: camelCase -> snake_case
                bedrooms: propertyData.bedrooms ? parseInt(propertyData.bedrooms) : null,
                bathrooms: propertyData.bathrooms ? parseInt(propertyData.bathrooms) : null,
                parking_spaces: propertyData.parkingSpaces ? parseInt(propertyData.parkingSpaces) : null, // Corrigido
                area: propertyData.area ? parseFloat(propertyData.area) : null,
                address: propertyData.address,
                neighborhood: propertyData.neighborhood || null,
                city: propertyData.city,
                state: propertyData.state,
                zip_code: propertyData.zipCode || null, // Corrigido
                latitude: propertyData.latitude || null,
                longitude: propertyData.longitude || null,
                developer_id: propertyData.developer_id || null, // Construtora associada
                images: mediaUrls.length > 0 ? mediaUrls.map(url => url.secure_url) : null,
                video_urls: videoUrls.length > 0 ? videoUrls : null,
                status: 'pending'
            };
```

**Campo `images`:**
- Tipo: `text[]` (array de strings)
- Conteúdo: Array de URLs do Cloudinary (ex: `["https://res.cloudinary.com/.../image1.jpg", "https://res.cloudinary.com/.../image2.jpg"]`)

---

## 🔄 Tratamento de Erros

### Rollback em caso de falha

Se houver erro ao salvar no banco (linha 122-139):

1. Deleta as imagens já enviadas do Cloudinary
2. Chama `deleteFromCloudinary()` para cada URL (linha 130)
3. Lança o erro para o usuário

```122:139:lib/propertyService.js
            if (error) {
                // Se houver erro, deletar as mídias já enviadas do Cloudinary
                if (mediaUrls.length > 0) {
                    console.log('⚠️ Erro ao criar propriedade, iniciando rollback de mídias...');
                    for (const mediaObj of mediaUrls) {
                        try {
                            // Verificar se o objeto tem secure_url antes de tentar deletar
                            if (mediaObj && mediaObj.secure_url) {
                                await deleteFromCloudinary(mediaObj.secure_url);
                            }
                        } catch (deleteError) {
                            console.error('Erro ao deletar mídia após falha:', deleteError);
                        }
                    }
                }
                console.error('Erro ao criar propriedade:', error);
                throw error;
            }
```

---

## 📊 Resumo do Fluxo

```
1. Usuário clica "Adicionar fotos"
   ↓
2. MediaUploadModal abre
   ↓
3. Usuário seleciona fotos (câmera ou galeria)
   ↓
4. Fotos adicionadas ao estado mediaFiles
   ↓
5. Usuário finaliza wizard e clica "Publicar"
   ↓
6. CreateAdWizard.handleSubmit()
   ↓
7. PropertyService.createProperty()
   ↓
8. MediaService.uploadMultipleFiles()
   ↓
9. Para cada foto: uploadToSupabase()
   ↓
10. uploadImageToCloudinary() → Cloudinary API
   ↓
11. Retorna URLs das imagens
   ↓
12. Salva no banco (campo images: text[])
   ↓
13. ✅ Anúncio criado com sucesso!
```

---

## 🔑 Pontos Importantes

1. **Armazenamento:** Fotos são armazenadas no **Cloudinary**, não no Supabase Storage
2. **Preset:** Usa o preset `"stories"` (unsigned upload)
3. **Formato:** URLs são armazenadas como array de strings no campo `images`
4. **Progresso:** Callback `onProgress` atualiza barra de progresso durante upload
5. **Validação:** Verifica limites do plano antes de permitir upload
6. **Rollback:** Se falhar ao salvar no banco, deleta as imagens do Cloudinary

---

## 📝 Notas Técnicas

- **MediaService** é um alias para `MediaServiceOptimized`
- **Vídeos** usam fluxo diferente (não Cloudinary, mas Supabase Storage ou Cloudinary com resource_type: "video")
- **Tamanho máximo:** 500MB por arquivo
- **Qualidade:** Imagens são comprimidas com `quality: 0.8` no ImagePicker

