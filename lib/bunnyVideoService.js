/**
 * 🐰 Bunny.net Video Service
 * 
 * Serviço para upload de vídeos para Bunny.net Stream
 * - Upload direto em uma única requisição (até 10GB)
 * - Progress tracking
 * - Retry automático
 */

import * as FileSystem from 'expo-file-system';

// ⚠️ IMPORTANTE: Configure suas credenciais Bunny.net no arquivo .env
// EXPO_PUBLIC_BUNNY_LIBRARY_ID=533844
// EXPO_PUBLIC_BUNNY_API_KEY=de277d9a-9871-4c13-8c533dd056f8-28f5-4f35
// const DEFAULT_LIBRARY_ID = '533844';
// const DEFAULT_API_KEY = 'de277d9a-9871-4c13-8c533dd056f8-28f5-4f35';
// const DEFAULT_PULLZONE = 'vz-533844.b-cdn.net';

const LIBRARY_ID = process.env.EXPO_PUBLIC_BUNNY_LIBRARY_ID || DEFAULT_LIBRARY_ID;
const API_KEY = process.env.EXPO_PUBLIC_BUNNY_API_KEY || DEFAULT_API_KEY;
const STREAM_HOSTNAME = process.env.EXPO_PUBLIC_BUNNY_STREAM_HOST || DEFAULT_PULLZONE;

const STREAM_BASE_URL = `https://${STREAM_HOSTNAME}`;
const EMBED_BASE_URL = 'https://iframe.mediadelivery.net/embed';

const BUNNY_CONFIG = {
    LIBRARY_ID,
    API_KEY,
    BASE_URL: 'https://video.bunnycdn.com/library',
    STREAM_BASE_URL,
    EMBED_BASE_URL,
};

export class BunnyVideoService {
    
    /**
     * Validar configuração
     */
    static validateConfig() {
        if (!BUNNY_CONFIG.LIBRARY_ID) {
            throw new Error('⚠️ BUNNY_CONFIG.LIBRARY_ID não configurado! Configure em lib/bunnyVideoService.js');
        }
        if (!BUNNY_CONFIG.API_KEY) {
            throw new Error('⚠️ BUNNY_CONFIG.API_KEY não configurado! Configure em lib/bunnyVideoService.js');
        }
    }

    /**
     * 1. Criar vídeo (iniciar upload)
     * Retorna o videoId (GUID) que será usado nas próximas operações
     */
    static async createVideo(title, collectionId = null) {
        try {
            this.validateConfig();
            
            console.log('🐰 [Bunny] Criando vídeo:', title);

            const body = {
                title: title || `Video ${Date.now()}`
            };

            // Adicionar collection se fornecido
            if (collectionId) {
                body.collectionId = collectionId;
            }

            const response = await fetch(
                `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos`,
                {
                    method: 'POST',
                    headers: {
                        'AccessKey': BUNNY_CONFIG.API_KEY,
                        'Content-Type': 'application/json',
                        'accept': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha ao criar vídeo: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ [Bunny] Vídeo criado:', data.guid);
            
            return {
                videoId: data.guid,
                libraryId: data.videoLibraryId
            };

        } catch (error) {
            console.error('❌ [Bunny] Erro ao criar vídeo:', error);
            throw error;
        }
    }

    /**
     * 2. Upload de vídeo - Direto (PUT único até 10GB)
     *
     * @param {string} videoId - ID do vídeo criado
     * @param {string} fileUri - URI local do arquivo
     * @param {function} onProgress - Callback de progresso (0-100)
     */
    static async uploadVideo(videoId, fileUri, onProgress = null) {
        try {
            this.validateConfig();
            
            console.log('🐰 [Bunny] Iniciando upload...');
            console.log('📦 Video ID:', videoId);
            console.log('📄 File URI:', fileUri);

            // Verificar tamanho do arquivo
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                throw new Error('Arquivo não encontrado');
            }

            const fileSizeMB = fileInfo.size / (1024 * 1024);
            console.log(`📦 Tamanho: ${fileSizeMB.toFixed(2)}MB`);

            // Validar tamanho máximo (10GB = 10240MB)
            if (fileSizeMB > 10240) {
                throw new Error(`Arquivo muito grande. Máximo: 10GB. Tamanho: ${fileSizeMB.toFixed(2)}MB`);
            }

            console.log('🎯 Método: DIRECT UPLOAD (até 10GB suportado)');

            return await this.uploadVideoDirect(videoId, fileUri, fileInfo.size, onProgress);

        } catch (error) {
            console.error('❌ [Bunny] Erro no upload:', error);
            throw error;
        }
    }

    /**
     * 3a. Upload direto (<100MB)
     */
    static async uploadVideoDirect(videoId, fileUri, fileSize, onProgress = null) {
        console.log('📤 [Bunny] Upload direto iniciado...');

        const uploadUrl = `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos/${videoId}`;
        const headers = {
            'AccessKey': BUNNY_CONFIG.API_KEY,
            'Content-Type': 'application/octet-stream',
            'Content-Length': `${fileSize}`
        };

        return new Promise((resolve, reject) => {
            const uploadTask = FileSystem.createUploadTask(
                uploadUrl,
                fileUri,
                {
                    httpMethod: 'PUT',
                    headers,
                    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
                },
                (progressData) => {
                    if (onProgress && progressData.totalBytesExpectedToSend > 0) {
                        const progress = Math.round((progressData.totalBytesSent / progressData.totalBytesExpectedToSend) * 100);
                        onProgress(Math.min(progress, 100));
                    }
                }
            );

            uploadTask.uploadAsync()
                .then((response) => {
                    if (response.status < 200 || response.status >= 300) {
                        console.error('❌ [Bunny] Upload direto retornou erro:', response.status, response.body);
                        reject(new Error(`Upload falhou: ${response.status} - ${response.body}`));
                        return;
                    }

                    console.log('✅ [Bunny] Upload direto concluído');
                    if (onProgress) {
                        onProgress(100);
                    }

                    resolve({
                        videoId,
                        success: true,
                        method: 'direct'
                    });
                })
                .catch((error) => {
                    console.error('❌ [Bunny] Erro no upload direto:', error);
                    reject(error);
                });
        });
    }

    /**
     * 4. Obter informações do vídeo
     */
    static async getVideoInfo(videoId) {
        try {
            this.validateConfig();

            const response = await fetch(
                `${BUNNY_CONFIG.BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/videos/${videoId}`,
                {
                    method: 'GET',
                    headers: {
                        'AccessKey': BUNNY_CONFIG.API_KEY,
                        'accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Falha ao obter info: ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('❌ [Bunny] Erro ao obter info:', error);
            throw error;
        }
    }

    /**
     * 5. Obter URL do vídeo para playback
     */
    static getVideoUrl(videoId, quality = 'playlist.m3u8') {
        const suffix = quality.endsWith('.m3u8') || quality.endsWith('.mp4') ? quality : `${quality}.m3u8`;
        return `${BUNNY_CONFIG.STREAM_BASE_URL}/${videoId}/${suffix}`;
    }

    /**
     * 6. Obter URL do thumbnail
     */
    static getThumbnailUrl(videoId) {
        return `${BUNNY_CONFIG.STREAM_BASE_URL}/${videoId}/thumbnail.jpg`;
    }

    /**
     * 7. Obter URL de embed (iframe) para web
     */
    static getEmbedUrl(videoId) {
        return `${BUNNY_CONFIG.EMBED_BASE_URL}/${BUNNY_CONFIG.LIBRARY_ID}/${videoId}`;
    }

    /**
     * 8. Extrair videoId a partir de qualquer URL do Bunny Stream
     */
    static extractVideoId(url) {
        if (!url) {
            return null;
        }

        const playlistMatch = url.match(/\/([0-9a-fA-F-]{36})\//);
        if (playlistMatch && playlistMatch[1]) {
            return playlistMatch[1];
        }

        const embedMatch = url.match(/embed\/[^/]+\/([0-9a-fA-F-]{36})/);
        if (embedMatch && embedMatch[1]) {
            return embedMatch[1];
        }

        return null;
    }

    /**
     * 9. Deletar vídeo
     */
    static async deleteVideo(videoId) {
        try {
            this.validateConfig();

            console.log('🗑️ [Bunny] Deletando vídeo:', videoId);

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
                throw new Error(`Delete falhou: ${response.status}`);
            }

            console.log('✅ [Bunny] Vídeo deletado');
            return true;

        } catch (error) {
            console.error('❌ [Bunny] Erro ao deletar:', error);
            throw error;
        }
    }

    /**
     * 10. Upload completo (criar + upload)
     * Método helper que combina createVideo + uploadVideo
     */
    static async uploadComplete(fileUri, title, onProgress = null) {
        try {
            console.log('═══════════════════════════════════════');
            console.log('🐰 Bunny.net - Upload Completo');
            console.log('═══════════════════════════════════════');

            // 1. Criar vídeo
            const { videoId } = await this.createVideo(title);

            // 2. Upload
            const result = await this.uploadVideo(videoId, fileUri, onProgress);

            // 3. Obter URLs
            const videoUrl = this.getVideoUrl(videoId);
            const thumbnailUrl = this.getThumbnailUrl(videoId);
            const embedUrl = this.getEmbedUrl(videoId);

            console.log('═══════════════════════════════════════');
            console.log('✅ Upload Completo!');
            console.log('═══════════════════════════════════════');
            console.log('🆔 Video ID:', videoId);
            console.log('🔗 Video URL:', videoUrl);
            console.log('🌐 Embed URL:', embedUrl);
            console.log('🖼️ Thumbnail:', thumbnailUrl);
            console.log('🎯 Método:', result.method);

            return {
                success: true,
                videoId,
                videoUrl,
                embedUrl,
                thumbnailUrl,
                method: result.method
            };

        } catch (error) {
            console.error('❌ [Bunny] Erro no upload completo:', error);
            throw error;
        }
    }
}

export default BunnyVideoService;

