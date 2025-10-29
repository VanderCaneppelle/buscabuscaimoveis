/**
 * Realtor Service
 * Serviço para gerenciar corretores (usuários com is_realtor=true)
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'realtors_with_properties_cache';
const CACHE_TIMESTAMP_KEY = 'realtors_with_properties_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const RealtorService = {
    /**
     * Buscar corretores que têm imóveis ativos
     * @param {Object} options - Opções de busca
     * @param {string} options.search - Termo de busca (nome do corretor)
     * @param {boolean} options.useCache - Se deve usar cache (padrão: true)
     * @returns {Promise<Array>} Lista de corretores com quantidade de imóveis
     */
    async getRealtorsWithProperties({ search = '', useCache = true } = {}) {
        try {
            // Tentar usar cache primeiro
            if (useCache) {
                const cached = await this.getCachedRealtors();
                if (cached) {
                    console.log('📦 RealtorService: Usando cache');
                    
                    // Aplicar busca no cache
                    if (search) {
                        const searchLower = search.toLowerCase();
                        return cached.filter(realtor =>
                            realtor.full_name?.toLowerCase().includes(searchLower) ||
                            realtor.email?.toLowerCase().includes(searchLower)
                        );
                    }
                    
                    return cached;
                }
            }

            console.log('🌐 RealtorService: Buscando do servidor...');

            // Buscar corretores com imóveis ativos
            const { data, error } = await supabase.rpc('get_realtors_with_properties');

            if (error) {
                console.error('❌ Erro ao buscar corretores:', error);
                throw error;
            }

            console.log(`✅ ${data?.length || 0} corretores encontrados`);

            // Salvar no cache
            if (data && data.length > 0) {
                await this.saveToCache(data);
            }

            // Aplicar busca se necessário
            if (search && data) {
                const searchLower = search.toLowerCase();
                return data.filter(realtor =>
                    realtor.full_name?.toLowerCase().includes(searchLower) ||
                    realtor.email?.toLowerCase().includes(searchLower)
                );
            }

            return data || [];

        } catch (error) {
            console.error('❌ RealtorService: Erro ao buscar corretores:', error);
            
            // Fallback para cache em caso de erro
            const cached = await this.getCachedRealtors();
            if (cached) {
                console.log('🔄 RealtorService: Usando cache como fallback');
                return cached;
            }
            
            throw error;
        }
    },

    /**
     * Salvar corretores no cache
     */
    async saveToCache(data) {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
            await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log('💾 RealtorService: Cache salvo');
        } catch (error) {
            console.error('❌ RealtorService: Erro ao salvar cache:', error);
        }
    },

    /**
     * Obter corretores do cache (se válido)
     */
    async getCachedRealtors() {
        try {
            const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
            if (!timestamp) return null;

            const cacheAge = Date.now() - parseInt(timestamp);
            if (cacheAge >= CACHE_DURATION) {
                console.log('⏰ RealtorService: Cache expirado');
                return null;
            }

            const cached = await AsyncStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('❌ RealtorService: Erro ao ler cache:', error);
            return null;
        }
    },

    /**
     * Limpar cache
     */
    async clearCache() {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
            console.log('🧹 RealtorService: Cache limpo');
        } catch (error) {
            console.error('❌ RealtorService: Erro ao limpar cache:', error);
        }
    },

    /**
     * Buscar um corretor específico por ID
     * @param {string} id - ID do corretor
     * @returns {Promise<Object>} Dados do corretor
     */
    async getRealtorById(id) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', id)
                .eq('is_realtor', true)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('❌ RealtorService: Erro ao buscar corretor:', error);
            throw error;
        }
    }
};

export default RealtorService;

