import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as VideoThumbnails from 'expo-video-thumbnails';
// import { upload } from 'cloudinary-react-native';
// import { cloudinary } from './cloudinary';
import uuid from 'react-native-uuid';

import { FormData } from 'react-native';


export class MediaServiceOptimized {
    static async requestCameraPermissions() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permissão de câmera é necessária');
        }
    }

    static async requestMediaLibraryPermissions() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Permissão de galeria é necessária');
        }
    }

    static async pickImage(options = {}) {
        try {
            await this.requestMediaLibraryPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false, // Desabilitar edição para múltiplas imagens
                allowsMultipleSelection: true,
                // aspect: [4, 3],
                quality: 0.7, // Reduzir qualidade para economizar memória
                ...options
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Retornar array de imagens selecionadas
                return result.assets.map((asset, index) => ({
                    uri: asset.uri,
                    type: 'image',
                    fileName: asset.fileName || `image_${Date.now()}_${index}.jpg`,
                    fileSize: asset.fileSize || 0
                }));
            }
            return [];
        } catch (error) {
            console.error('Erro ao selecionar imagem:', error);
            throw error;
        }
    }

    static async pickSingleImage(options = {}) {
        try {
            await this.requestPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                allowsMultipleSelection: false,
                aspect: [4, 3],
                quality: 0.7,
                ...options
            });

            if (!result.canceled && result.assets && result.assets[0]) {
                return {
                    uri: result.assets[0].uri,
                    type: 'image',
                    fileName: result.assets[0].fileName || `image_${Date.now()}.jpg`,
                    fileSize: result.assets[0].fileSize || 0
                };
            }
            return null;
        } catch (error) {
            console.error('Erro ao selecionar imagem única:', error);
            throw error;
        }
    }

    static async takePhoto(options = {}) {
        try {
            await this.requestCameraPermissions();

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
            await this.requestMediaLibraryPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.7, // Qualidade mais baixa para vídeos
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
                // Para imagens, usar Cloudinary
                const result = await this.uploadImageToCloudinary(fileUri, fileName, mimeType);
                return result.secure_url; // Retorna a URL da imagem
            }
        } catch (error) {
            console.error('Erro no upload de arquivo pequeno:', error);
            throw error;
        }
    }

    // Método principal que escolhe o tipo de upload
    static async uploadVideoWithFetch(fileUri, fileName, bucket, mimeType, onProgress = null) {
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const sizeMB = fileInfo.size / (1024 * 1024);

            console.log("🧾 Nome:", fileName);
            console.log("📱 Plataforma:", Platform.OS);
            console.log("🧾 MIME:", mimeType);
            console.log("📏 Tamanho do arquivo (MB):", sizeMB.toFixed(2));

            if (sizeMB <= 80) {
                console.log("⬆️ Upload direto (pequeno)");
                return await this.uploadShortVideoToCloudinary(fileUri, fileName, mimeType, onProgress);
            }

            console.log("⬆️ Upload grande via upload_large");
            return await this.uploadVideoLargeToCloudinary(fileUri, fileName, mimeType, onProgress);
        } catch (error) {
            console.error("❌ Erro no upload de vídeo:", error);
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
                return await this.uploadVideoAndroidChunked(fileUri, fileName, mimeType, onProgress = null);
            } else {
                console.log('📦 Arquivo pequeno, usando upload direto');
                return await this.uploadVideoAndroidDirect(fileUri, fileName, bucket, mimeType, onProgress = null);
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


    // Upload em chunks para vídeos grandes (Android) via backend
    static async uploadVideoAndroidChunked(fileUri, fileName, mimeType, onProgress = null) {
        try {
            console.log('🎬 Iniciando upload de vídeo direto para Cloudinary...');

            const result = await upload(cloudinary, {
                file: fileUri,
                options: {
                    upload_preset: "stories", // seu preset configurado no Cloudinary
                    resource_type: "video"
                },
                // Callback de progresso (se precisar)
                callback: (event) => {
                    if (event.event === "progress" && onProgress) {
                        const progress = Math.round((event.bytes / event.total) * 100);
                        onProgress(progress);
                    }
                }
            });

            console.log('✅ Upload concluído:', result);
            return result;
        } catch (error) {
            console.error('❌ Erro no upload de vídeo:', error);
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

    // Upload de imagens direto para Cloudinary
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
                    const maxSize = 200 * 1024 * 1024; // 50MB

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
    static async saveStoryToDatabase(publicUrl, title, mediaType, thumbnailUrl = null, linkUrl = null, linkText = null, linkPosition = null, titlePosition = null, linkCoordinates = null, titleCoordinates = null, titleLayout = null, titleScale = null, linkScale = null, userId = null) {
        try {
            console.log('🔍 DEBUG - saveStoryToDatabase - title recebido:', title);
            console.log('🔍 DEBUG - saveStoryToDatabase - title type:', typeof title);
            console.log('🔍 DEBUG - saveStoryToDatabase - title || null:', title || null);
            console.log('💾 Salvando story no banco de dados:', { title, mediaType, publicUrl, linkUrl, linkText });

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

            console.log('🔍 DEBUG - Antes do insert no banco');
            console.log('🔍 DEBUG - Dados para insert:', {
                title: title || null,
                image_url: publicUrl.secure_url,
                media_type: mediaType,
                order_index: nextOrderIndex
            });

            // Salvar no banco de dados
            const { data: insertedStory, error: dbError } = await supabase
                .from('stories')
                .insert({
                    title: title || null, // Permitir título vazio
                    image_url: publicUrl.secure_url,
                    thumbnail_url: thumbnailUrl?.secure_url ?? null,
                    media_type: mediaType,
                    status: 'active',
                    order_index: nextOrderIndex,
                    user_id: userId, // ID do usuário que criou o story
                    link_url: linkUrl,
                    link_text: linkText,
                    link_position: linkPosition,
                    title_position: titlePosition,
                    link_coordinates: linkCoordinates ? JSON.stringify(linkCoordinates) : null,
                    title_coordinates: titleCoordinates ? JSON.stringify(titleCoordinates) : null,
                    title_layout: titleLayout,
                    title_scale: titleScale,
                    link_scale: linkScale,
                })
                .select('id')
                .single();

            if (dbError) {
                console.error('❌ Erro ao salvar story no banco:', dbError);
                console.error('🔍 DEBUG - Detalhes do erro:', {
                    message: dbError.message,
                    details: dbError.details,
                    hint: dbError.hint,
                    code: dbError.code
                });
                throw new Error('Erro ao salvar story no banco de dados');
            }

            console.log('✅ Story salvo no banco com sucesso!');

            // Enviar push para todos os usuários informando novo story
            try {
                const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL || 'https://buscabusca.vercel.app';
                const titleMsg = '🆕 Novo Story publicado';
                const bodyMsg = title ? `Confira: ${title}` : '💰URGENTE 🚨 Vai lá no Busca Busca agora que saiu uma oportunidade!!!!';

                await fetch(`${apiUrl}/api/notifications?action=send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: titleMsg,
                        body: bodyMsg,
                        data: {
                            type: 'new_story',
                            screen: 'StoryViewer',
                            params: { forceReload: true, initialStoryId: insertedStory?.id }
                        },
                        sendToAll: true
                    })
                });
            } catch (notifyError) {
                console.warn('⚠️ Falha ao enviar push de novo story (não crítico):', notifyError);
            }

            return {
                publicUrl: publicUrl,
                orderIndex: nextOrderIndex,
                success: true
            };

        } catch (error) {
            console.error('❌ Erro ao salvar story no banco: AQUII', error);
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
    static async uploadStory(fileUri, title = 'Story', mediaType = null, onProgress = null, linkData = null, titlePosition = 'bottom-center', titleCoordinates = null, titleLayout = 'center', titleScale = 1.0, linkScale = 1.0, userId = null) {
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
            const maxSize = 200 * 1024 * 1024; // 50MB
            if (fileInfo.size > maxSize) {
                throw new Error(`AQUIII Arquivo muito grande. Máximo: 50MB. Tamanho: ${(fileInfo.size / 1024 / 1024).toFixed(2)}MB`);
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
            const dbResult = await this.saveStoryToDatabase(publicUrl, title, mediaType, thumbnailUrl, linkData?.url, linkData?.text, linkData?.position, titlePosition, linkData?.coordinates, titleCoordinates, titleLayout, titleScale, linkScale, userId);

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
            await this.requestCameraPermissions();

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false, // ✅ NÃO obriga edição/corte
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
            await this.requestCameraPermissions();

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false, // ✅ NÃO obriga edição/corte
                quality: 0.8,
                ...options
            });

            if (!result.canceled && result.assets[0]) {
                const initialMedia = {
                    uri: result.assets[0].uri,
                    type: 'image',
                    fileName: result.assets[0].fileName || `story_photo_${Date.now()}.jpg`,
                    fileSize: result.assets[0].fileSize || 0
                };

                console.log('📸 [MediaService] captureStoryPhoto: Mídia capturada, indo direto para preview');
                return initialMedia;
            }
            return null;
        } catch (error) {
            console.error('Erro ao capturar foto para story:', error);
            throw error;
        }
    }

    // Função específica para selecionar mídia para stories (apenas 1 mídia)
    static async pickStoryMedia(options = {}) {
        try {
            console.log('📱 [MediaService] pickStoryMedia: Iniciando seleção de mídia para story...');
            await this.requestMediaLibraryPermissions();

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All, // Permite foto e vídeo
                allowsEditing: false, // ✅ Imagem 100% original sem zoom
                allowsMultipleSelection: false, // ✅ Apenas 1 mídia
                quality: 1, // ✅ Qualidade máxima
                exif: false, // ✅ Sem metadados EXIF
                base64: false, // ✅ Sem base64 para economizar memória
                ...options
            });

            console.log('📱 [MediaService] pickStoryMedia: Resultado bruto:', result);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0]; // ✅ Pegar apenas o primeiro (único)
                
                console.log('📱 [MediaService] pickStoryMedia: Asset selecionado:', {
                    uri: asset.uri,
                    type: asset.type,
                    fileName: asset.fileName,
                    fileSize: asset.fileSize,
                    width: asset.width,
                    height: asset.height
                });
                
                // ✅ Log das dimensões originais para debug
                console.log('📱 [MediaService] pickStoryMedia: Dimensões originais:', {
                    width: asset.width,
                    height: asset.height,
                    aspectRatio: asset.width / asset.height
                });

                // Determinar tipo baseado no asset
                const mediaType = asset.type === 'video' ? 'video' : 'image';
                
                const initialMedia = {
                    uri: asset.uri,
                    type: mediaType,
                    fileName: asset.fileName || `story_${mediaType}_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`,
                    fileSize: asset.fileSize || 0,
                    width: asset.width,
                    height: asset.height
                };

                // ✅ Sem crop - retornar mídia diretamente
                console.log('📱 Mídia selecionada, indo direto para preview');
                return initialMedia;
            }
            
            console.log('📱 [MediaService] pickStoryMedia: Nenhuma mídia selecionada');
            return null;
        } catch (error) {
            console.error('❌ [MediaService] pickStoryMedia: Erro ao selecionar mídia:', error);
            throw error;
        }
    }



    static async uploadShortVideoToCloudinary(fileUri, fileName, mimeType, onProgress = null) {
        try {
            console.log("🎬 Iniciando upload de vídeo para Cloudinary...");

            const data = new global.FormData();
            data.append("file", {
                uri: fileUri,
                type: mimeType,   // ← MIME type dinâmico
                name: fileName,   // ← Nome dinâmico
            });
            data.append("upload_preset", "stories"); // seu preset UNSIGNED

            const xhr = new XMLHttpRequest();
            xhr.open(
                "POST",
                "https://api.cloudinary.com/v1_1/djtl3cvkz/video/upload"
            );

            return new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status !== 200) {
                        console.error("❌ Erro no upload:", xhr.responseText);
                        reject(xhr.responseText);
                        return;
                    }
                    const response = JSON.parse(xhr.responseText);
                    console.log("✅ Upload concluído:", response);
                    resolve(response);
                };

                xhr.onerror = () => reject(new Error("Erro de rede no upload"));

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
            console.error("❌ Erro no upload de vídeo:", error);
            throw error;
        }
    }

    // Upload grande usando upload_large do Cloudinary
    static async uploadVideoLargeToCloudinary(fileUri, fileName, mimeType, onProgress = null) {
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const totalSize = fileInfo.size;
            const uploadId = uuid.v4();
            const CLOUDINARY_CLOUD_NAME = 'djtl3cvkz';

            console.log(` Tamanho total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

            const uploadPreset = 'stories';
            const resourceType = 'video';
            const baseUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}`;

            // ✅ DEFINIR PUBLIC_ID AQUI
            const publicId = fileName.replace(/\.[^/.]+$/, ""); // Remove extensão
            console.log(`🏷️ Public ID único: ${publicId}`);


            // ✅ 1. CHUNK MAIOR QUE 5MB (exceto o último)
            const chunkSize = 10 * 1024 * 1024; // 10MB por chunk (maior que 5MB)
            let start = 0;
            let part = 1;
            let jsonResponse = null;

            while (start < totalSize) {
                const end = Math.min(start + chunkSize, totalSize);
                const currentChunkSize = end - start;

                console.log(`📦 Processando chunk ${part}: ${start}-${end} (${currentChunkSize} bytes)`);

                // ✅ VERIFICAR TAMANHO DO CHUNK
                if (currentChunkSize < 5 * 1024 * 1024 && end < totalSize) {
                    console.warn(`⚠️ Chunk ${part} menor que 5MB: ${(currentChunkSize / 1024 / 1024).toFixed(2)}MB`);
                }

                // ✅ 2. LER CHUNK E CONVERTER BASE64 PARA BYTES
                const chunkContent = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                    length: currentChunkSize,
                    position: start
                });

                // ✅ CONVERTER BASE64 PARA BYTES CORRETAMENTE
                const binaryString = atob(chunkContent);
                const chunkBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    chunkBytes[i] = binaryString.charCodeAt(i);
                }

                console.log(`📊 Chunk ${part} convertido: ${chunkBytes.length} bytes`);

                // ✅ CRIAR ARQUIVO TEMPORÁRIO COM BYTES
                const tempFileName = `chunk_${part}_${Date.now()}.tmp`;
                const tempFilePath = `${FileSystem.cacheDirectory}${tempFileName}`;

                // ✅ SALVAR BYTES NO ARQUIVO TEMPORÁRIO
                await FileSystem.writeAsStringAsync(tempFilePath, chunkContent, {
                    encoding: FileSystem.EncodingType.Base64
                });

                // ✅ VERIFICAR TAMANHO DO ARQUIVO TEMPORÁRIO
                const tempFileInfo = await FileSystem.getInfoAsync(tempFilePath);
                console.log(`�� Tamanho do arquivo temporário ${part}: ${(tempFileInfo.size / 1024 / 1024).toFixed(2)}MB`);

                // ✅ VERIFICAR SE O TAMANHO ESTÁ CORRETO
                if (tempFileInfo.size !== currentChunkSize) {
                    throw new Error(`Tamanho incorreto do chunk ${part}: esperado ${currentChunkSize}, obtido ${tempFileInfo.size}`);
                }

                const formData = new global.FormData();

                formData.append('upload_preset', uploadPreset);
                formData.append('public_id', publicId);
                formData.append('resource_type', resourceType);

                // ✅ SOLUÇÃO: Usar Blob com dados do chunk
                try {
                    const chunkBlob = new Blob([chunkBytes], { type: mimeType });
                    formData.append("file", chunkBlob, `${fileName}_part${part}`);
                    console.log(`✅ Blob criado para chunk ${part}: ${chunkBlob.size} bytes`);
                } catch (blobError) {
                    console.warn('⚠️ Erro ao criar Blob, usando alternativa:', blobError);

                    // ✅ ALTERNATIVA: Usar base64 string
                    const dataString = `data:${mimeType};base64,${chunkContent}`;
                    formData.append("file", dataString);
                }

                console.log(`⬆️ Enviando chunk ${part} (${(currentChunkSize / 1024 / 1024).toFixed(2)}MB)...`);

                // ✅ 3. HEADERS CORRETOS
                const headers = {
                    "X-Unique-Upload-Id": uploadId,
                    "Content-Range": `bytes ${start}-${end - 1}/${totalSize}`,
                };

                console.log(`🔧 Headers do chunk ${part}:`, headers);

                const res = await fetch(`${baseUrl}/upload`, {
                    method: "POST",
                    headers: headers,
                    body: formData,
                });

                console.log(` Status do chunk ${part}:`, res.status);

                if (!res.ok) {
                    const text = await res.text();
                    console.error(`❌ Erro no chunk ${part}:`, text);
                    await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
                    throw new Error(`Falha no upload_large: ${text}`);
                }

                jsonResponse = await res.json();
                console.log(`✅ Chunk ${part} enviado com sucesso:`, jsonResponse.public_id);

                // ✅ LIMPAR ARQUIVO TEMPORÁRIO
                await FileSystem.deleteAsync(tempFilePath, { idempotent: true });

                if (onProgress) {
                    const progress = Math.round((end / totalSize) * 100);
                    onProgress(progress);
                    console.log(`📊 Progresso: ${progress}%`);
                }

                if (part < Math.ceil(totalSize / chunkSize)) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                start = end;
                part++;
            }

            console.log("🎉 Upload finalizado:", jsonResponse);
            return jsonResponse;

        } catch (error) {
            console.error("❌ Erro no upload large:", error);
            throw error;
        }
    }
} 