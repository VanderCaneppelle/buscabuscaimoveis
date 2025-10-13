/**
 * StoryService para Backend
 * Versão backend para uso em scripts/cronjobs
 * Gerencia stories: inativação e exclusão com limpeza de mídias
 */

import { supabase } from './supabase.js';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Extrair public_id do Cloudinary a partir da URL
 */
function extractCloudinaryPublicId(url) {
    try {
        // Exemplo de URL: https://res.cloudinary.com/[cloud_name]/image/upload/v1234567890/folder/filename.jpg
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        if (match && match[1]) {
            return match[1];
        }
        return null;
    } catch (error) {
        console.error('Erro ao extrair public_id:', error);
        return null;
    }
}

/**
 * Detectar tipo de recurso da URL do Cloudinary
 */
function detectResourceType(url) {
    if (url.includes('/video/')) {
        return 'video';
    } else if (url.includes('/image/')) {
        return 'image';
    } else {
        return 'raw';
    }
}

/**
 * Deletar arquivo do Cloudinary usando SDK direto
 */
async function deleteFromCloudinary(url) {
    try {
        console.log('   🗑️ Excluindo do Cloudinary:', url);

        const publicId = extractCloudinaryPublicId(url);
        if (!publicId) {
            console.warn('   ⚠️ Não foi possível extrair public_id da URL');
            return false;
        }

        const resourceType = detectResourceType(url);

        console.log('   📋 Public ID:', publicId);
        console.log('   📋 Resource Type:', resourceType);

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        console.log('   ✅ Arquivo excluído do Cloudinary:', result);
        return true;

    } catch (error) {
        console.warn('   ⚠️ Erro ao excluir do Cloudinary:', error.message);
        return false;
    }
}

/**
 * Deletar arquivo do Supabase Storage
 */
async function deleteFromSupabase(url) {
    try {
        if (!url || typeof url !== 'string') {
            return false;
        }

        if (!url.includes('supabase.co/storage')) {
            return false;
        }

        console.log('   🗑️ Excluindo do Supabase Storage:', url);

        // Extrair bucket e path da URL
        // Exemplo: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
        const urlParts = url.split('/storage/v1/object/public/');
        if (urlParts.length < 2) {
            console.warn('   ⚠️ URL do Supabase inválida');
            return false;
        }

        const [bucket, ...pathParts] = urlParts[1].split('/');
        const filePath = pathParts.join('/');

        const { error } = await supabase
            .storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.warn('   ⚠️ Erro ao excluir do Supabase Storage:', error.message);
            return false;
        }

        console.log('   ✅ Arquivo excluído do Supabase Storage');
        return true;

    } catch (error) {
        console.warn('   ⚠️ Erro ao excluir do Supabase Storage:', error.message);
        return false;
    }
}

/**
 * StoryService Backend
 */
export class StoryService {
    /**
     * Buscar story por ID
     */
    static async getStoryById(storyId) {
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao buscar story:', error);
            throw error;
        }
    }

    /**
     * Buscar stories ativos criados nas últimas 24 horas
     */
    static async getActiveRecentStories() {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar stories recentes:', error);
            throw error;
        }
    }

    /**
     * Buscar stories ativos criados há mais de 24 horas
     */
    static async getStoriesOlderThan24Hours() {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'active')
                .lt('created_at', twentyFourHoursAgo.toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar stories antigos:', error);
            throw error;
        }
    }

    /**
     * Buscar stories inativos criados há mais de 48 horas
     */
    static async getInactiveStoriesOlderThan48Hours() {
        try {
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('status', 'inactive')
                .lt('created_at', fortyEightHoursAgo.toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar stories inativos antigos:', error);
            throw error;
        }
    }

    /**
     * Inativar story (apenas muda status, não deleta)
     */
    static async inactivateStory(storyId) {
        try {
            console.log(`   📝 Inativando story ${storyId}...`);

            const { error } = await supabase
                .from('stories')
                .update({ 
                    status: 'inactive',
                    updated_at: new Date().toISOString()
                })
                .eq('id', storyId);

            if (error) {
                throw error;
            }

            console.log(`   ✅ Story ${storyId} inativado`);
            return true;

        } catch (error) {
            console.error(`   ❌ Erro ao inativar story ${storyId}:`, error);
            throw error;
        }
    }

    /**
     * Deletar story e suas mídias
     * Versão backend - exclui do Cloudinary, Supabase Storage e banco de dados
     */
    static async deleteStory(storyId) {
        try {
            console.log(`   🔍 Buscando story ${storyId}...`);

            // Buscar story para obter URLs das mídias
            const story = await this.getStoryById(storyId);

            if (!story) {
                console.warn(`   ⚠️ Story ${storyId} não encontrado`);
                return false;
            }

            // Deletar mídias do storage
            let deletedMediaCount = 0;
            const mediaUrls = [];

            // Adicionar URLs à lista (se existirem)
            if (story.image_url) {
                mediaUrls.push(story.image_url);
            }
            if (story.thumbnail_url) {
                mediaUrls.push(story.thumbnail_url);
            }

            if (mediaUrls.length > 0) {
                console.log(`   📸 Excluindo ${mediaUrls.length} mídia(s)...`);

                for (const mediaUrl of mediaUrls) {
                    try {
                        if (!mediaUrl || typeof mediaUrl !== 'string') {
                            continue;
                        }

                        // Deletar do Supabase Storage
                        const deletedFromSupabase = await deleteFromSupabase(mediaUrl);

                        // Deletar do Cloudinary se for URL do Cloudinary
                        let deletedFromCloudinary = false;
                        if (mediaUrl.includes('cloudinary.com')) {
                            deletedFromCloudinary = await deleteFromCloudinary(mediaUrl);
                        }

                        if (deletedFromSupabase || deletedFromCloudinary) {
                            deletedMediaCount++;
                        }

                    } catch (deleteError) {
                        console.warn('   ⚠️ Erro ao deletar mídia:', deleteError.message);
                        // Continuar mesmo se falhar ao deletar uma mídia
                    }
                }

                console.log(`   ✅ ${deletedMediaCount}/${mediaUrls.length} mídia(s) excluída(s)`);
            }

            // Deletar story do banco
            console.log(`   🗑️ Excluindo story do banco de dados...`);
            const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (error) {
                throw error;
            }

            console.log(`   ✅ Story ${storyId} excluído do banco de dados`);
            return true;

        } catch (error) {
            console.error('   ❌ Erro ao deletar story:', error);
            throw error;
        }
    }

    /**
     * Inativar múltiplos stories
     */
    static async inactivateMultipleStories(storyIds) {
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const storyId of storyIds) {
            try {
                await this.inactivateStory(storyId);
                successCount++;
                results.push({
                    storyId,
                    success: true
                });
            } catch (error) {
                errorCount++;
                results.push({
                    storyId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            total: storyIds.length,
            success: successCount,
            errors: errorCount,
            results
        };
    }

    /**
     * Deletar múltiplos stories
     */
    static async deleteMultipleStories(storyIds) {
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (const storyId of storyIds) {
            try {
                await this.deleteStory(storyId);
                successCount++;
                results.push({
                    storyId,
                    success: true
                });
            } catch (error) {
                errorCount++;
                results.push({
                    storyId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            total: storyIds.length,
            success: successCount,
            errors: errorCount,
            results
        };
    }
}

