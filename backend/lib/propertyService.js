/**
 * PropertyService para Backend
 * Versão simplificada para uso em scripts/cronjobs
 */

import { supabase } from './supabase.js';
import fetch from 'node-fetch';
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
git * Detectar tipo de recurso da URL do Cloudinary
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
 * Mais confiável que chamar a API via HTTP
 */
async function deleteFromCloudinary(url) {
    try {
        console.log('   🗑️ Excluindo do Cloudinary:', url);

        // Extrair public_id da URL
        const publicId = extractCloudinaryPublicId(url);
        if (!publicId) {
            console.warn('   ⚠️ Não foi possível extrair public_id da URL');
            return false;
        }

        // Detectar tipo de recurso
        const resourceType = detectResourceType(url);

        console.log('   📋 Public ID:', publicId);
        console.log('   📋 Resource Type:', resourceType);

        // Usar SDK do Cloudinary para exclusão direta
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

        // Verificar se é URL do Supabase Storage
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
 * PropertyService Backend
 */
export class PropertyService {
    /**
     * Buscar propriedade por ID
     */
    static async getPropertyById(propertyId) {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', propertyId)
                .single();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao buscar propriedade:', error);
            throw error;
        }
    }

    /**
     * Deletar propriedade e suas mídias
     * Versão backend - exclui do Cloudinary, Supabase Storage e banco de dados
     */
    static async deleteProperty(propertyId) {
        try {
            console.log(`   🔍 Buscando propriedade ${propertyId}...`);

            // Buscar propriedade para obter URLs das mídias
            const property = await this.getPropertyById(propertyId);

            if (!property) {
                console.warn(`   ⚠️ Propriedade ${propertyId} não encontrada`);
                return false;
            }

            // Deletar mídias do storage
            let deletedMediaCount = 0;
            if (property.images && Array.isArray(property.images) && property.images.length > 0) {
                console.log(`   📸 Excluindo ${property.images.length} mídia(s)...`);

                for (const imageUrl of property.images) {
                    try {
                        if (!imageUrl || typeof imageUrl !== 'string') {
                            continue;
                        }

                        // Deletar do Supabase Storage
                        const deletedFromSupabase = await deleteFromSupabase(imageUrl);

                        // Deletar do Cloudinary se for URL do Cloudinary
                        let deletedFromCloudinary = false;
                        if (imageUrl.includes('cloudinary.com')) {
                            deletedFromCloudinary = await deleteFromCloudinary(imageUrl);
                        }

                        if (deletedFromSupabase || deletedFromCloudinary) {
                            deletedMediaCount++;
                        }

                    } catch (deleteError) {
                        console.warn('   ⚠️ Erro ao deletar mídia:', deleteError.message);
                        // Continuar mesmo se falhar ao deletar uma mídia
                    }
                }

                console.log(`   ✅ ${deletedMediaCount}/${property.images.length} mídia(s) excluída(s)`);
            }

            // Deletar propriedade do banco
            console.log(`   🗑️ Excluindo propriedade do banco de dados...`);
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId);

            if (error) {
                throw error;
            }

            console.log(`   ✅ Propriedade ${propertyId} excluída do banco de dados`);
            return true;

        } catch (error) {
            console.error('   ❌ Erro ao deletar propriedade:', error);
            throw error;
        }
    }
}

