import { supabase } from './supabase';
import { MediaServiceOptimized as MediaService } from './mediaServiceOptimized';

export class PropertyService {
    static async createProperty(propertyData, mediaFiles = [], onProgress = null) {
        try {
            // Upload das mídias primeiro
            let mediaUrls = [];
            if (mediaFiles.length > 0) {
                mediaUrls = await MediaService.uploadMultipleFiles(mediaFiles, 'properties', 'media', onProgress);
            }

            // Preparar dados da propriedade
            const property = {
                user_id: propertyData.user_id,
                title: propertyData.title,
                description: propertyData.description || null,
                price: parseFloat(propertyData.price),
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
                images: mediaUrls.length > 0 ? mediaUrls : null,
                status: 'pending'
            };

            // Inserir no banco
            const { data, error } = await supabase
                .from('properties')
                .insert(property)
                .select()
                .single();

            if (error) {
                // Se houver erro, deletar as mídias já enviadas
                if (mediaUrls.length > 0) {
                    for (const url of mediaUrls) {
                        try {
                            await MediaService.deleteFromSupabase(url);
                        } catch (deleteError) {
                            console.error('Erro ao deletar mídia após falha:', deleteError);
                        }
                    }
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao criar propriedade:', error);
            throw error;
        }
    }

    static async getUserProperties(userId, status = null) {
        try {
            let query = supabase
                .from('properties')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar propriedades do usuário:', error);
            throw error;
        }
    }

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

    static async updateProperty(propertyId, propertyData, newMediaFiles = [], removeMediaUrls = []) {
        try {
            // Deletar mídias removidas
            if (removeMediaUrls.length > 0) {
                for (const url of removeMediaUrls) {
                    try {
                        await MediaService.deleteFromSupabase(url);
                    } catch (deleteError) {
                        console.error('Erro ao deletar mídia:', deleteError);
                    }
                }
            }

            // Upload de novas mídias
            let newMediaUrls = [];
            if (newMediaFiles.length > 0) {
                newMediaUrls = await MediaService.uploadMultipleFiles(newMediaFiles);
            }

            // Buscar propriedade atual para obter mídias existentes
            const currentProperty = await this.getPropertyById(propertyId);
            const currentImages = currentProperty.images || [];

            // Filtrar mídias que não foram removidas
            const remainingImages = currentImages.filter(url => !removeMediaUrls.includes(url));

            // Combinar mídias restantes com novas
            const updatedImages = [...remainingImages, ...newMediaUrls];

            // Preparar dados para atualização
            const updateData = {
                title: propertyData.title,
                description: propertyData.description || null,
                price: parseFloat(propertyData.price),
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
                images: updatedImages.length > 0 ? updatedImages : null,
                updated_at: new Date().toISOString()
            };

            // Atualizar no banco
            const { data, error } = await supabase
                .from('properties')
                .update(updateData)
                .eq('id', propertyId)
                .select()
                .single();

            if (error) {
                // Se houver erro, deletar as novas mídias já enviadas
                if (newMediaUrls.length > 0) {
                    for (const url of newMediaUrls) {
                        try {
                            await MediaService.deleteFromSupabase(url);
                        } catch (deleteError) {
                            console.error('Erro ao deletar mídia após falha:', deleteError);
                        }
                    }
                }
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Erro ao atualizar propriedade:', error);
            throw error;
        }
    }

    static async deleteProperty(propertyId) {
        try {
            // Buscar propriedade para obter URLs das mídias
            const property = await this.getPropertyById(propertyId);

            // Deletar mídias do storage
            if (property.images && property.images.length > 0) {
                for (const imageUrl of property.images) {
                    try {
                        await MediaService.deleteFromSupabase(imageUrl);
                    } catch (deleteError) {
                        console.error('Erro ao deletar mídia:', deleteError);
                    }
                }
            }

            // Deletar propriedade do banco
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Erro ao deletar propriedade:', error);
            throw error;
        }
    }

    static async searchProperties(filters = {}) {
        try {
            let query = supabase
                .from('properties')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false });

            // Aplicar filtros
            if (filters.city) {
                query = query.ilike('city', `%${filters.city}%`);
            }
            if (filters.property_type) {
                query = query.eq('property_type', filters.property_type);
            }
            if (filters.transaction_type) {
                query = query.eq('transaction_type', filters.transaction_type);
            }
            if (filters.min_price) {
                query = query.gte('price', parseFloat(filters.min_price));
            }
            if (filters.max_price) {
                query = query.lte('price', parseFloat(filters.max_price));
            }
            if (filters.min_bedrooms) {
                query = query.gte('bedrooms', parseInt(filters.min_bedrooms));
            }
            if (filters.min_bathrooms) {
                query = query.gte('bathrooms', parseInt(filters.min_bathrooms));
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar propriedades:', error);
            throw error;
        }
    }

    static async getPropertyStats(userId) {
        try {
            const { data, error } = await supabase
                .from('properties')
                .select('status')
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            const stats = {
                total: data.length,
                pending: data.filter(p => p.status === 'pending').length,
                approved: data.filter(p => p.status === 'approved').length,
                rejected: data.filter(p => p.status === 'rejected').length
            };

            return stats;
        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            throw error;
        }
    }
} 