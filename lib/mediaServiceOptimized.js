import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as VideoThumbnails from 'expo-video-thumbnails';


export class MediaServiceOptimized {
    static async requestPermissions() {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

        if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
            throw new Error('Permissões de câmera e galeria são necessárias');
        }
    }

    static async pickImage(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                // aspect: [4, 3],
                quality: 0.7, // Reduzir qualidade para economizar memória
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'image',
                    fileName: result.assets[0].fileName || `image_${Date.now()}.jpg`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao selecionar imagem:', error);
            throw error;
        }
    }

    static async takePhoto(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                // Reduzir qualidade
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'image',
                    fileName: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao tirar foto:', error);
            throw error;
        }
    }

    static async pickVideo(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.5, // Qualidade mais baixa para vídeos
                videoMaxDuration: 30, // Reduzir para 30 segundos
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'video',
                    fileName: result.assets[0].fileName || `video_${Date.now()}.mp4`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao selecionar vídeo:', error);
            throw error;
        }
    }

    // Upload otimizado para arquivos grandes
    static async uploadToSupabase(fileUri, bucket = 'properties', folder = 'media', onProgress = null) {
        try {
            // Verificar conectividade primeiro
            await this.checkConnectivity();

            const fileExtension = fileUri.split('.').pop() || 'jpg';
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const maxSize = 50 * 1024 * 1024; // 50MB máximo

            if (fileInfo.size > maxSize) {
                throw new Error(`Arquivo muito grande. Máximo permitido: 50MB. Tamanho atual: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
            }

            // Verificar se é vídeo primeiro
            const mimeType = this.getMimeType(fileExtension);
            const isVideo = mimeType.startsWith('video/');

            if (isVideo) {
                // Para vídeos, sempre usar fetch independente do tamanho
                return await this.uploadVideoWithFetch(fileUri, fileName, bucket, mimeType, onProgress);
            } else {
                // Para imagens, usar lógica de tamanho
                if (fileInfo.size < 5 * 1024 * 1024) {
                    return await this.uploadSmallFile(fileUri, fileName, bucket, onProgress);
                } else {
                    return await this.uploadLargeFile(fileUri, fileName, bucket, onProgress);
                }
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            throw error;
        }
    }

    // Verificar conectividade com o Supabase
    static async checkConnectivity() {
        try {
            // Tentar uma operação simples para verificar conectividade
            const { data, error } = await supabase.storage
                .from('properties')
                .list('', { limit: 1 });

            if (error && error.message.includes('Network request failed')) {
                throw new Error('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
            }
        } catch (error) {
            if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
                throw new Error('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
            }
            // Se for outro erro (como permissões), não é problema de conectividade
        }
    }

    // Upload para arquivos pequenos
    static async uploadSmallFile(fileUri, fileName, bucket) {
        try {
            const fileExtension = fileUri.split('.').pop() || 'jpg';
            const mimeType = this.getMimeType(fileExtension);

            // Verificar se é vídeo e usar abordagem diferente
            const isVideo = mimeType.startsWith('video/');

            if (isVideo) {
                // Para vídeos, usar fetch para evitar problemas de MIME type
                return await this.uploadVideoWithFetch(fileUri, fileName, bucket, mimeType);
            } else {
                // Para imagens, usar FileSystem
                return await this.uploadImageWithFileSystem(fileUri, fileName, bucket, mimeType);
            }
        } catch (error) {
            console.error('Erro no upload de arquivo pequeno:', error);
            throw error;
        }
    }

    static async uploadVideoWithFetch(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            console.log('🔍 Enviando vídeo para Supabase');
            console.log('🧾 URI:', fileUri);
            console.log('🧾 MIME:', mimeType);
            console.log('🧾 Nome:', fileName);
            console.log('📱 Plataforma:', Platform.OS);

            // Garantir que o MIME type está correto
            const finalMimeType = mimeType || this.getMimeTypeFromUri(fileUri) || 'video/mp4';
            console.log('🧾 MIME Final:', finalMimeType);

            // Verificar conectividade específica para vídeos
            await this.checkVideoConnectivity();

            // Usar método específico por plataforma
            if (Platform.OS === 'android') {
                return await this.uploadVideoAndroid(fileUri, fileName, bucket, finalMimeType, onProgress);
            } else {
                return await this.uploadVideoIOS(fileUri, fileName, bucket, finalMimeType, onProgress);
            }
        } catch (error) {
            console.error('❌ Erro no upload de vídeo:', error);
            throw error;
        }
    }

    // Upload específico para Android
    static async uploadVideoAndroid(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            console.log('🤖 Usando método específico para Android');

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            console.log('📏 Tamanho do arquivo:', fileInfo.size, 'bytes');

            // Se arquivo > 10MB, usar upload em chunks
            if (fileInfo.size > 10 * 1024 * 1024) {
                console.log('📦 Arquivo grande detectado, usando upload em chunks');
                return await this.uploadVideoAndroidChunked(fileUri, fileName, bucket, mimeType, onProgress);
            } else {
                console.log('📦 Arquivo pequeno, usando upload direto');
                return await this.uploadVideoAndroidDirect(fileUri, fileName, bucket, mimeType, onProgress);
            }
        } catch (error) {
            console.error('❌ Erro no upload de vídeo (Android):', error);
            throw error;
        }
    }

    // Upload direto para vídeos pequenos no Android
    static async uploadVideoAndroidDirect(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            console.log('🤖 Upload direto para vídeo pequeno (Android)');

            // Notificar início do upload
            if (onProgress) {
                onProgress(0);
            }

            // Ler arquivo como ArrayBuffer usando FileSystem
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Converter base64 para Uint8Array
            const binaryString = atob(fileContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            console.log('📦 Bytes criados, tamanho:', bytes.length, 'bytes');

            // Notificar progresso de leitura
            if (onProgress) {
                onProgress(50);
            }

            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    console.log(`🔄 Tentativa ${4 - retries}/3 de upload direto (Android)...`);

                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, bytes, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: mimeType,
                        });

                    if (error) {
                        console.error('❌ Erro do Supabase (Android):', error);
                        throw error;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);

                    // Notificar conclusão
                    if (onProgress) {
                        onProgress(100);
                    }

                    console.log('✅ Vídeo enviado com sucesso (Android):', publicUrl);
                    return publicUrl;
                } catch (error) {
                    lastError = error;
                    retries--;

                    if (retries > 0) {
                        console.warn(`⚠️ Tentativa de upload de vídeo falhou (Android), tentando novamente... (${retries} restantes)`);
                        console.warn(`⚠️ Erro:`, error.message);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            throw lastError;
        } catch (error) {
            console.error('❌ Erro no upload de vídeo (Android):', error);
            throw error;
        }
    }

    // Upload em chunks para vídeos grandes no Android
    static async uploadVideoAndroidChunked(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            console.log('🤖 Upload em chunks para vídeo grande (Android)');

            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const chunkSize = 2 * 1024 * 1024; // 2MB por chunk (menor que o anterior)
            const totalChunks = Math.ceil(fileInfo.size / chunkSize);

            console.log(`📦 Upload em ${totalChunks} chunks de ${chunkSize / (1024 * 1024)}MB cada`);

            // Notificar início do upload
            if (onProgress) {
                onProgress(0);
            }

            // Criar arquivo vazio primeiro
            const { data: createData, error: createError } = await supabase.storage
                .from(bucket)
                .upload(fileName, new Uint8Array(0), {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: mimeType,
                });

            if (createError) {
                console.error('❌ Erro ao criar arquivo vazio:', createError);
                throw createError;
            }

            console.log('✅ Arquivo vazio criado, iniciando upload em chunks...');

            // Upload em chunks
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, fileInfo.size);
                const currentChunkSize = end - start;

                console.log(`📦 Processando chunk ${chunkIndex + 1}/${totalChunks} (${currentChunkSize} bytes)`);

                // Ler chunk específico
                const chunkContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    length: currentChunkSize,
                    position: start
                });

                // Converter base64 para Uint8Array
                const binaryString = atob(chunkContent);
                const chunkBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    chunkBytes[i] = binaryString.charCodeAt(i);
                }

                // Atualizar arquivo com o chunk
                const { data: updateData, error: updateError } = await supabase.storage
                    .from(bucket)
                    .update(fileName, chunkBytes, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: mimeType,
                    });

                if (updateError) {
                    console.error(`❌ Erro ao atualizar chunk ${chunkIndex + 1}:`, updateError);
                    throw updateError;
                }

                console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} enviado`);

                // Atualizar progresso
                if (onProgress) {
                    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
                    onProgress(progress);
                }

                // Pequena pausa entre chunks para evitar sobrecarga
                if (chunkIndex < totalChunks - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            console.log('✅ Vídeo enviado com sucesso em chunks (Android):', publicUrl);
            return publicUrl;

        } catch (error) {
            console.error('❌ Erro no upload de vídeo em chunks (Android):', error);
            throw error;
        }
    }

    // Upload específico para iOS
    static async uploadVideoIOS(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            console.log('🍎 Usando método seguro para iOS do MediaServiceOptimized');

            if (onProgress) onProgress(0);

            // Ler como base64
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            if (onProgress) onProgress(50);

            // Converter base64 -> Uint8Array
            const binary = atob(base64Data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }

            // Upload para o Supabase
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, bytes, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: mimeType,
                });

            if (error) {
                console.error('❌ Erro do Supabase (iOS):', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            if (onProgress) onProgress(100);

            console.log('✅ Vídeo enviado com sucesso (iOS):', publicUrl);
            return publicUrl;

        } catch (error) {
            console.error('❌ Erro no upload de vídeo (iOS):', error);
            throw error;
        }
    }

    // Verificar conectividade específica para vídeos
    static async checkVideoConnectivity() {
        try {
            console.log('🌐 Verificando conectividade para vídeos...');

            // Tentar uma operação simples para verificar conectividade
            const { data, error } = await supabase.storage
                .from('properties')
                .list('', { limit: 1 });

            if (error) {
                console.error('❌ Erro de conectividade:', error);
                if (error.message.includes('Network request failed')) {
                    throw new Error('Problema de conectividade com o Supabase Storage. Verifique sua internet e tente novamente.');
                }
                throw error;
            }

            console.log('✅ Conectividade OK');
        } catch (error) {
            console.error('❌ Erro na verificação de conectividade:', error);
            throw error;
        }
    }

    // Função auxiliar para extrair MIME type da URI
    static getMimeTypeFromUri(uri) {
        try {
            const extension = uri.split('.').pop()?.toLowerCase();
            console.log('🔍 Extensão detectada:', extension);

            const mimeTypes = {
                'mp4': 'video/mp4',
                'mov': 'video/quicktime',
                'avi': 'video/x-msvideo',
                'm4v': 'video/mp4',
                '3gp': 'video/3gpp',
                'webm': 'video/webm',
                'mkv': 'video/x-matroska'
            };

            const mimeType = mimeTypes[extension] || 'video/mp4';
            console.log('🔍 MIME type detectado:', mimeType);
            return mimeType;
        } catch (error) {
            console.warn('⚠️ Erro ao detectar MIME type da URI:', error);
            return 'video/mp4';
        }
    }

    // Upload de imagens usando FileSystem
    static async uploadImageWithFileSystem(fileUri, fileName, bucket, mimeType) {
        try {
            // Ler arquivo como ArrayBuffer usando FileSystem
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Converter base64 para Uint8Array
            const binaryString = atob(fileContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Tentar upload com retry
            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, bytes, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: mimeType
                        });

                    if (error) {
                        throw error;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);

                    return publicUrl;
                } catch (error) {
                    lastError = error;
                    retries--;

                    if (retries > 0) {
                        console.log(`Tentativa de upload de imagem falhou, tentando novamente... (${retries} tentativas restantes)`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            throw lastError;
        } catch (error) {
            console.error('Erro no upload de imagem:', error);
            throw error;
        }
    }

    // Upload em chunks para arquivos grandes
    static async uploadLargeFile(fileUri, fileName, bucket) {
        try {
            console.log('🔍 Enviando arquivo grande para Supabase');
            console.log('🧾 URI:', fileUri);
            console.log('🧾 Nome:', fileName);

            const chunkSize = 1024 * 1024; // 1MB por chunk
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const totalChunks = Math.ceil(fileInfo.size / chunkSize);

            // Criar arquivo vazio primeiro
            const fileExtension = fileUri.split('.').pop() || 'jpg';
            const mimeType = this.getMimeType(fileExtension);
            console.log('🧾 MIME:', mimeType);

            const { data: initData, error: initError } = await supabase.storage
                .from(bucket)
                .upload(fileName, new Uint8Array(0), {
                    contentType: mimeType,
                    cacheControl: '3600',
                    upsert: false
                });

            if (initError) {
                throw initError;
            }

            // Upload em chunks
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, fileInfo.size);

                // Ler chunk do arquivo
                const chunk = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    length: end - start,
                    position: start
                });

                // Converter para Uint8Array
                const binaryString = atob(chunk);
                const bytes = new Uint8Array(binaryString.length);
                for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                }

                // Upload do chunk
                const { error: chunkError } = await supabase.storage
                    .from(bucket)
                    .update(fileName, bytes, {
                        upsert: true
                    });

                if (chunkError) {
                    throw chunkError;
                }

                console.log(`Chunk ${i + 1}/${totalChunks} enviado`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error('Erro no upload de arquivo grande:', error);
            throw error;
        }
    }

    // Upload múltiplo com verificação de tamanho
    static async uploadMultipleFiles(files, bucket = 'properties', folder = 'media', onProgress = null) {
        try {
            const uploadedUrls = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                console.log(`📤 Enviando arquivo ${i + 1}/${files.length}: ${file.fileName || file.uri}`);

                try {
                    // Verificar tamanho individual
                    const fileInfo = await FileSystem.getInfoAsync(file.uri);
                    const maxSize = 50 * 1024 * 1024; // 50MB

                    if (fileInfo.size > maxSize) {
                        throw new Error(`Arquivo ${i + 1} muito grande. Máximo: 50MB. Tamanho: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
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

    static getMimeType(extension) {
        if (!extension) return 'image/jpeg'; // Fallback padrão

        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'm4v': 'video/mp4',
            '3gp': 'video/3gpp'
        };

        const cleanExtension = extension.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        return mimeTypes[cleanExtension] || 'image/jpeg'; // Fallback para imagem
    }

    static async deleteFromSupabase(fileUrl, bucket = 'properties') {
        try {
            const fileName = fileUrl.split('/').pop();
            const { error } = await supabase.storage
                .from(bucket)
                .remove([fileName]);

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Erro ao deletar arquivo:', error);
            throw error;
        }
    }

    // Função para salvar story no banco de dados
    static async saveStoryToDatabase(publicUrl, title, mediaType, thumbnailUrl = null) {
        try {
            console.log('💾 Salvando story no banco de dados:', { title, mediaType, publicUrl });

            // Buscar próximo order_index
            const { data: maxOrderData, error: orderError } = await supabase
                .from('stories')
                .select('order_index')
                .order('order_index', { ascending: false })
                .limit(1);

            if (orderError) {
                console.error('❌ Erro ao buscar order_index:', orderError);
                throw new Error('Erro ao buscar ordem dos stories');
            }

            const nextOrderIndex = (maxOrderData?.[0]?.order_index || 0) + 1;
            console.log('📊 Próximo order_index:', nextOrderIndex);

            // Salvar no banco de dados
            const { error: dbError } = await supabase
                .from('stories')
                .insert({
                    title: title,
                    image_url: publicUrl,
                    thumbnail_url: thumbnailUrl,
                    media_type: mediaType,
                    status: 'active',
                    order_index: nextOrderIndex,
                });

            if (dbError) {
                console.error('❌ Erro ao salvar story no banco:', dbError);
                throw new Error('Erro ao salvar story no banco de dados');
            }

            console.log('✅ Story salvo no banco com sucesso!');
            return {
                publicUrl: publicUrl,
                orderIndex: nextOrderIndex,
                success: true
            };

        } catch (error) {
            console.error('❌ Erro ao salvar story no banco:', error);
            throw error;
        }
    }

    static async generateVideoThumbnail(videoUri) {
        try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
                time: 1000, // 1s do vídeo
            });
            console.log('🖼️ Thumbnail gerada localmente:', uri);

            // Retornar URI local para fazer upload depois
            return uri;
        } catch (e) {
            console.error('❌ Erro ao gerar thumbnail do vídeo:', e);
            throw e;
        }
    }

    // Função específica para upload de stories (baseada em uploadMultipleFiles)
    static async uploadStory(fileUri, title = 'Story', mediaType = null, onProgress = null) {
        try {
            // Detectar automaticamente o tipo de mídia se não for fornecido
            if (!mediaType) {
                const fileExtension = fileUri.split('.').pop()?.toLowerCase();
                const mimeType = this.getMimeType(fileExtension);
                mediaType = mimeType.startsWith('video/') ? 'video' : 'image';
                console.log('🔍 Tipo de mídia detectado automaticamente:', mediaType, 'para extensão:', fileExtension);
            }

            console.log('🎬 Iniciando upload de story USANDO MediaServiceOptimized:', { uri: fileUri, title, mediaType });

            // Verificar tamanho do arquivo original
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (fileInfo.size > maxSize) {
                throw new Error(`Arquivo muito grande. Máximo: 50MB. Tamanho: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
            }

            let finalUri = fileUri;

            // Criar callback de progresso
            const storyProgress = onProgress ? (progress) => {
                console.log(`📤 Progresso do story: ${progress}%`);
                onProgress(progress);
            } : null;

            // Upload principal para Supabase
            const publicUrl = await this.uploadToSupabase(
                finalUri,
                'stories',
                'stories',
                storyProgress
            );

            console.log('✅ Story enviado com sucesso:', publicUrl);

            // Gerar thumbnail para vídeos
            let thumbnailUrl = null;
            if (mediaType === 'video') {
                const thumbnailLocalUri = await this.generateVideoThumbnail(finalUri);
                thumbnailUrl = await this.uploadToSupabase(
                    thumbnailLocalUri,
                    'stories',
                    'thumbnails', // você pode manter no mesmo bucket ou subpasta
                );
                console.log('🖼️ Thumbnail gerado e enviado com sucesso:', thumbnailUrl);
            }

            // Salvar no banco de dados
            const dbResult = await this.saveStoryToDatabase(publicUrl, title, mediaType, thumbnailUrl);

            return {
                publicUrl: publicUrl,
                thumbnailUrl: thumbnailUrl,
                orderIndex: dbResult.orderIndex,
                success: true
            };

        } catch (error) {
            console.error('❌ Erro no upload do story:', error);
            throw error;
        }
    }

    // Função para capturar vídeo para story
    static async captureStoryVideo(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                aspect: [9, 16], // Aspecto vertical para stories
                quality: 0.8,
                videoMaxDuration: 15, // Máximo 15 segundos para stories
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'video',
                    fileName: result.assets[0].fileName || `story_video_${Date.now()}.mp4`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao capturar vídeo para story:', error);
            throw error;
        }
    }

    // Função para capturar foto para story
    static async captureStoryPhoto(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [9, 16], // Aspecto vertical para stories
                quality: 0.8,
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'image',
                    fileName: result.assets[0].fileName || `story_photo_${Date.now()}.jpg`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao capturar foto para story:', error);
            throw error;
        }
    }
} 