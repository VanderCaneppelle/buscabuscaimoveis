import { supabase } from './supabase';
import { buildBackendUrl, BACKEND_CONFIG } from './config';

export class StoryService {
    /**
     * Excluir story completo (banco + mídias)
     * @param {string} storyId - ID do story
     * @param {string} userId - ID do usuário (para verificação de permissão)
     * @returns {Promise<boolean>} - true se excluído com sucesso
     */
    static async deleteStory(storyId, userId) {
        try {

            // 1. Buscar dados do story para verificar permissão e URLs
            const { data: story, error: fetchError } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .eq('user_id', userId) // Garantir que só o criador pode excluir
                .single();

            if (fetchError || !story) {
                throw new Error('Story não encontrado ou você não tem permissão para excluí-lo');
            }


            // 2. Excluir mídias dos storages
            await this.deleteStoryMedia(story);

            // 3. Excluir do banco de dados
            const { error: deleteError } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId)
                .eq('user_id', userId);

            if (deleteError) {
                throw new Error(`Erro ao excluir do banco: ${deleteError.message}`);
            }
            return true;

        } catch (error) {
            console.error('❌ Erro no StoryService.deleteStory:', error);
            throw error;
        }
    }

    /**
     * Excluir mídias do story dos storages
     * @param {Object} story - Dados do story
     */
    static async deleteStoryMedia(story) {
        try {
            console.log('🗑️ Excluindo mídias do story...');

            // Excluir mídia principal
            if (story.image_url) {
                await this.deleteMediaFromStorage(story.image_url);
            }

            // Excluir thumbnail
            if (story.thumbnail_url) {
                await this.deleteMediaFromStorage(story.thumbnail_url);
            }

            console.log('✅ Mídias excluídas com sucesso');

        } catch (error) {
            console.warn('⚠️ Erro ao excluir mídias (não crítico):', error);
            // Não re-throw para não impedir a exclusão do story
        }
    }

    /**
     * Excluir mídia de um storage específico
     * @param {string} url - URL da mídia
     */
    static async deleteMediaFromStorage(url) {
        try {
            if (url.includes('cloudinary.com')) {
                await this.deleteFromCloudinary(url);
            } else if (url.includes('supabase.co')) {
                await this.deleteFromSupabaseStorage(url);
            } else {
                console.log('⚠️ URL não reconhecida, pulando exclusão:', url);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao excluir mídia:', error);
        }
    }

    /**
 * Excluir do Cloudinary via backend
 * @param {string} url - URL do Cloudinary
 */
    static async deleteFromCloudinary(url) {
        try {
            console.log('🗑️ Excluindo do Cloudinary via backend:', url);

            // Chamar endpoint do backend para exclusão
            const backendUrl = buildBackendUrl(BACKEND_CONFIG.ENDPOINTS.DELETE_CLOUDINARY);
            console.log('🌐 Chamando backend:', backendUrl);

            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Buscabuscaimoveis/1.0'
                },
                body: JSON.stringify({ url })
            });

            console.log('📡 Resposta do backend:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro no backend:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Erro no backend: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ Arquivo excluído do Cloudinary via backend:', result);

        } catch (error) {
            console.warn('⚠️ Erro ao excluir do Cloudinary via backend:', error);
            // Não re-throw para não impedir a exclusão do story
        }
    }

    /**
     * Excluir do Supabase Storage
     * @param {string} url - URL do Supabase Storage
     */
    static async deleteFromSupabaseStorage(url) {
        try {
            console.log('🗑️ Tentando excluir do Supabase Storage:', url);

            // Extrair nome do arquivo da URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            // Se a URL contém pasta, extrair o caminho completo
            const bucketName = 'stories'; // ou detectar dinamicamente
            let filePath = fileName;

            // Se a URL contém pasta, extrair o caminho completo
            if (url.includes('/stories/')) {
                const storiesIndex = url.indexOf('/stories/');
                filePath = url.substring(storiesIndex + 9); // +9 para pular '/stories/'
            }

            console.log('🗑️ Excluindo arquivo:', { bucketName, filePath });

            const { error } = await supabase.storage
                .from(bucketName)
                .remove([filePath]);

            if (error) {
                console.error('❌ Erro ao excluir do Supabase Storage:', error);
                throw error;
            } else {
                console.log('✅ Arquivo excluído do Supabase Storage:', filePath);
            }

        } catch (error) {
            console.error('❌ Erro ao excluir do Supabase Storage:', error);
            // Não re-throw para não impedir a exclusão do story
        }
    }



    /**
     * Verificar se usuário pode excluir story
     * @param {string} storyId - ID do story
     * @param {string} userId - ID do usuário
     * @returns {Promise<boolean>} - true se pode excluir
     */
    static async canUserDeleteStory(storyId, userId) {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('user_id')
                .eq('id', storyId)
                .single();

            if (error || !data) {
                return false;
            }

            return data.user_id === userId;
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            return false;
        }
    }
}
