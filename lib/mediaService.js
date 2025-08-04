import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export class MediaService {
    static async requestPermissions() {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();

        if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
            throw new Error('Permissões de câmera e galeria são necessárias');
        }
    }

    static async pickImage(options = {}) {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
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
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
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
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.7,
                videoMaxDuration: 60, // 60 segundos máximo
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

    // Upload direto sem converter para base64
    static async uploadToSupabase(fileUri, bucket = 'properties', folder = 'media', onProgress = null) {
        try {
            const fileExtension = fileUri.split('.').pop() || 'jpg';
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const maxSize = 50 * 1024 * 1024; // 50MB

            if (fileInfo.size > maxSize) {
                throw new Error(`Arquivo muito grande. Máximo permitido: 50MB`);
            }

            // Upload direto usando abordagem específica por tipo
            const mimeType = this.getMimeType(fileExtension);

            // Verificar se é vídeo e usar abordagem diferente
            const isVideo = mimeType.startsWith('video/');

            if (isVideo) {
                // Para vídeos, sempre usar fetch para evitar problemas de MIME type
                return await this.uploadVideoWithFetch(fileUri, fileName, bucket, mimeType, onProgress);
            } else {
                // Para imagens, usar FileSystem
                return await this.uploadImageWithFileSystem(fileUri, fileName, bucket, mimeType, onProgress);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            throw error;
        }
    }

    // Upload múltiplo com limite de tamanho
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
                        throw new Error(`Arquivo ${i + 1} muito grande. Máximo: 50MB`);
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

    // Upload de vídeos usando fetch
    static async uploadVideoWithFetch(fileUri, fileName, bucket, mimeType) {
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
                return await this.uploadVideoAndroid(fileUri, fileName, bucket, finalMimeType);
            } else {
                return await this.uploadVideoIOS(fileUri, fileName, bucket, finalMimeType);
            }
        } catch (error) {
            console.error('Erro no upload de vídeo:', error);
            throw error;
        }
    }

    // Upload específico para Android
    static async uploadVideoAndroid(fileUri, fileName, bucket, mimeType) {
        try {
            console.log('🤖 Usando método específico para Android');

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            console.log('📏 Tamanho do arquivo:', fileInfo.size, 'bytes');

            // Se arquivo > 10MB, usar upload em chunks
            if (fileInfo.size > 10 * 1024 * 1024) {
                console.log('📦 Arquivo grande detectado, usando upload em chunks');
                return await this.uploadVideoAndroidChunked(fileUri, fileName, bucket, mimeType);
            } else {
                console.log('📦 Arquivo pequeno, usando upload direto');
                return await this.uploadVideoAndroidDirect(fileUri, fileName, bucket, mimeType);
            }
        } catch (error) {
            console.error('Erro no upload de vídeo (Android):', error);
            throw error;
        }
    }

    // Upload direto para vídeos pequenos no Android
    static async uploadVideoAndroidDirect(fileUri, fileName, bucket, mimeType) {
        try {
            console.log('🤖 Upload direto para vídeo pequeno (Android)');

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

                    console.log('✅ Vídeo enviado com sucesso (Android):', publicUrl);
                    return publicUrl;
                } catch (error) {
                    lastError = error;
                    retries--;

                    if (retries > 0) {
                        console.log(`Tentativa de upload de vídeo falhou (Android), tentando novamente... (${retries} tentativas restantes)`);
                        console.log(`⚠️ Erro:`, error.message);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            throw lastError;
        } catch (error) {
            console.error('Erro no upload de vídeo (Android):', error);
            throw error;
        }
    }

    // Upload em chunks para vídeos grandes no Android
    static async uploadVideoAndroidChunked(fileUri, fileName, bucket, mimeType) {
        try {
            console.log('🤖 Upload em chunks para vídeo grande (Android)');

            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const chunkSize = 2 * 1024 * 1024; // 2MB por chunk (menor que o anterior)
            const totalChunks = Math.ceil(fileInfo.size / chunkSize);

            console.log(`📦 Upload em ${totalChunks} chunks de ${chunkSize / (1024 * 1024)}MB cada`);

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
            console.error('Erro no upload de vídeo em chunks (Android):', error);
            throw error;
        }
    }

    // Upload específico para iOS
    static async uploadVideoIOS(fileUri, fileName, bucket, mimeType) {
        try {
            console.log('🍎 Usando método específico para iOS');

            // Usar fetch para vídeos
            const response = await fetch(fileUri);
            if (!response.ok) {
                throw new Error(`Erro ao ler arquivo: ${response.status} ${response.statusText}`);
            }

            const rawBlob = await response.blob();
            console.log('📦 Blob criado, tamanho:', rawBlob.size, 'bytes');

            // Forçar o tipo MIME corretamente
            const blob = new Blob([rawBlob], { type: mimeType });

            let retries = 3;
            let lastError = null;

            while (retries > 0) {
                try {
                    console.log(`🔄 Tentativa ${4 - retries}/3 de upload (iOS)...`);

                    const { data, error } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, blob, {
                            cacheControl: '3600',
                            upsert: false,
                            contentType: mimeType
                        });

                    if (error) {
                        console.error('❌ Erro do Supabase (iOS):', error);
                        throw error;
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(fileName);

                    console.log('✅ Vídeo enviado com sucesso (iOS):', publicUrl);
                    return publicUrl;
                } catch (error) {
                    lastError = error;
                    retries--;

                    if (retries > 0) {
                        console.log(`Tentativa de upload de vídeo falhou (iOS), tentando novamente... (${retries} tentativas restantes)`);
                        console.log(`⚠️ Erro:`, error.message);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            throw lastError;
        } catch (error) {
            console.error('Erro no upload de vídeo (iOS):', error);
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

    static async deleteFromSupabase(fileUrl, bucket = 'properties') {
        try {
            // Extrair nome do arquivo da URL
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
}

