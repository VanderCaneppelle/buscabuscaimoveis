import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY = 'properties_cache';
const CACHE_TIMESTAMP_KEY = 'properties_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const PAGE_SIZE = 15; // Propriedades por página

class PropertyCacheService {
    // Cache local das propriedades
    static cache = new Map();
    static lastFetchTime = 0;

    /**
     * Buscar propriedades com cache e paginação
     */
    static async getProperties(options = {}) {
        const {
            page = 0,
            filters = {},
            searchTerm = '',
            forceRefresh = false,
            pageSize = PAGE_SIZE
        } = options;

        console.log('🚀🚀🚀 PropertyCacheService: INICIANDO BUSCA DE PROPRIEDADES 🚀🚀🚀');
        console.log('📋 Parâmetros:', { page, filters, searchTerm, forceRefresh, pageSize });

        try {
            // Verificar se podemos usar cache
            const cacheValid = await this.isCacheValid();
            console.log('🔍 PropertyCacheService: Cache válido?', cacheValid);
            console.log('🔍 PropertyCacheService: Force refresh?', forceRefresh);

            if (!forceRefresh && cacheValid) {
                console.log('📦📦📦 PropertyCacheService: USANDO CACHE LOCAL 📦📦📦');
                const cachedData = await this.getCachedProperties();
                console.log(`📦 PropertyCacheService: ${cachedData.length} propriedades encontradas no cache`);

                // Aplicar filtros e busca no cache
                const filteredData = this.applyFiltersAndSearch(cachedData, filters, searchTerm);
                console.log(`🔍 PropertyCacheService: Após filtros: ${filteredData.length} propriedades`);

                // Aplicar paginação
                const paginatedData = this.applyPagination(filteredData, page, pageSize);
                console.log(`📄 PropertyCacheService: Página ${page}: ${paginatedData.length} propriedades`);

                console.log('✅✅✅ PropertyCacheService: RETORNANDO DADOS DO CACHE ✅✅✅');

                return {
                    data: paginatedData,
                    totalCount: filteredData.length,
                    hasMore: (page + 1) * pageSize < filteredData.length,
                    fromCache: true,
                    cacheInfo: {
                        totalCached: cachedData.length,
                        filtered: filteredData.length,
                        page: page,
                        pageSize: pageSize
                    }
                };
            }

            // Buscar do servidor
            console.log('🌐🌐🌐 PropertyCacheService: BUSCANDO DO SERVIDOR 🌐🌐🌐');
            const serverData = await this.fetchFromServer(filters, searchTerm);
            console.log(`🌐 PropertyCacheService: ${serverData.length} propriedades recebidas do servidor`);

            // Salvar no cache
            await this.saveToCache(serverData);
            console.log('💾 PropertyCacheService: Dados salvos no cache');

            // Aplicar paginação
            const paginatedData = this.applyPagination(serverData, page, pageSize);
            console.log(`📄 PropertyCacheService: Página ${page}: ${paginatedData.length} propriedades`);

            console.log('✅✅✅ PropertyCacheService: RETORNANDO DADOS DO SERVIDOR ✅✅✅');

            return {
                data: paginatedData,
                totalCount: serverData.length,
                hasMore: (page + 1) * pageSize < serverData.length,
                fromCache: false,
                serverInfo: {
                    totalReceived: serverData.length,
                    page: page,
                    pageSize: pageSize
                }
            };

        } catch (error) {
            console.error('❌❌❌ PropertyCacheService: ERRO AO BUSCAR PROPRIEDADES ❌❌❌', error);

            // Fallback para cache mesmo se expirado
            try {
                console.log('🔄🔄🔄 PropertyCacheService: USANDO CACHE COMO FALLBACK 🔄🔄🔄');
                const cachedData = await this.getCachedProperties();
                console.log(`📦 PropertyCacheService: Fallback - ${cachedData.length} propriedades no cache`);

                const filteredData = this.applyFiltersAndSearch(cachedData, filters, searchTerm);
                const paginatedData = this.applyPagination(filteredData, page, pageSize);

                console.log(`📦 PropertyCacheService: Fallback - ${paginatedData.length} propriedades retornadas`);

                return {
                    data: paginatedData,
                    totalCount: filteredData.length,
                    hasMore: (page + 1) * pageSize < filteredData.length,
                    fromCache: true,
                    error: 'Usando cache devido a erro de conexão',
                    fallbackInfo: {
                        totalCached: cachedData.length,
                        filtered: filteredData.length,
                        page: page,
                        pageSize: pageSize
                    }
                };
            } catch (cacheError) {
                console.error('❌❌❌ PropertyCacheService: ERRO AO USAR CACHE DE FALLBACK ❌❌❌', cacheError);
                throw error;
            }
        }
    }

    /**
     * Verificar se o cache ainda é válido
     */
    static async isCacheValid() {
        try {
            const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
            if (!timestamp) {
                console.log('📦 PropertyCacheService: Nenhum timestamp de cache encontrado');
                return false;
            }

            const cacheAge = Date.now() - parseInt(timestamp);
            const isValid = cacheAge < CACHE_DURATION;

            console.log(`📦 PropertyCacheService: Cache age: ${Math.floor(cacheAge / 1000)}s, válido: ${isValid}`);
            return isValid;
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao verificar validade do cache:', error);
            return false;
        }
    }

    /**
     * Buscar propriedades do servidor
     */
    static async fetchFromServer(filters = {}, searchTerm = '') {
        console.log('🌐 PropertyCacheService: Iniciando busca no servidor');
        console.log('🔍 Filtros aplicados:', filters);
        console.log('🔍 Termo de busca:', searchTerm || 'Nenhum');

        let query = supabase
            .from('properties')
            .select('*, images')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        // Aplicar pesquisa
        if (searchTerm) {
            console.log(`🔍 Aplicando busca por: "${searchTerm}"`);
            query = query.or(`title.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,neighborhood.ilike.%${searchTerm}%`);
        }

        // Aplicar filtros
        if (filters.city) {
            console.log(`🏙️ Filtrando por cidade: "${filters.city}"`);
            query = query.ilike('city', `%${filters.city}%`);
        }
        if (filters.propertyType) {
            console.log(`🏠 Filtrando por tipo: "${filters.propertyType}"`);
            query = query.eq('property_type', filters.propertyType);
        }
        if (filters.minPrice) {
            console.log(`💰 Preço mínimo: R$ ${filters.minPrice}`);
            query = query.gte('price', parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            console.log(`💰 Preço máximo: R$ ${filters.maxPrice}`);
            query = query.lte('price', parseFloat(filters.maxPrice));
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ PropertyCacheService: Erro na consulta do servidor:', error);
            throw new Error(`Erro ao buscar propriedades: ${error.message}`);
        }

        console.log(`🌐 PropertyCacheService: Sucesso! ${data?.length || 0} propriedades recebidas do servidor`);
        return data || [];
    }

    /**
     * Salvar dados no cache
     */
    static async saveToCache(data) {
        try {
            console.log(`💾 PropertyCacheService: Salvando ${data.length} propriedades no cache`);
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
            await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            this.lastFetchTime = Date.now();
            console.log('💾 PropertyCacheService: Cache atualizado com sucesso');
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao salvar cache:', error);
        }
    }

    /**
     * Obter dados do cache
     */
    static async getCachedProperties() {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            const data = cached ? JSON.parse(cached) : [];
            console.log(`📦 PropertyCacheService: Lendo cache - ${data.length} propriedades encontradas`);
            return data;
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao ler cache:', error);
            return [];
        }
    }

    /**
     * Aplicar filtros e busca nos dados
     */
    static applyFiltersAndSearch(data, filters = {}, searchTerm = '') {
        let filteredData = [...data];

        // Aplicar busca
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.title?.toLowerCase().includes(searchLower) ||
                item.city?.toLowerCase().includes(searchLower) ||
                item.neighborhood?.toLowerCase().includes(searchLower)
            );
        }

        // Aplicar filtros
        if (filters.city) {
            const cityLower = filters.city.toLowerCase();
            filteredData = filteredData.filter(item =>
                item.city?.toLowerCase().includes(cityLower)
            );
        }

        if (filters.propertyType) {
            filteredData = filteredData.filter(item =>
                item.property_type === filters.propertyType
            );
        }

        if (filters.minPrice) {
            filteredData = filteredData.filter(item =>
                item.price >= parseFloat(filters.minPrice)
            );
        }

        if (filters.maxPrice) {
            filteredData = filteredData.filter(item =>
                item.price <= parseFloat(filters.maxPrice)
            );
        }

        return filteredData;
    }

    /**
     * Aplicar paginação
     */
    static applyPagination(data, page, pageSize) {
        const startIndex = page * pageSize;
        const endIndex = startIndex + pageSize;
        return data.slice(startIndex, endIndex);
    }

    /**
     * Limpar cache
     */
    static async clearCache() {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
            await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
            this.cache.clear();
            this.lastFetchTime = 0;
            console.log('🗑️ Cache de propriedades limpo');
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    }

    /**
     * Forçar atualização do cache
     */
    static async refreshCache() {
        try {
            console.log('🔄 Forçando atualização do cache');
            const data = await this.fetchFromServer();
            await this.saveToCache(data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar cache:', error);
            throw error;
        }
    }

    /**
     * Obter estatísticas do cache
     */
    static async getCacheStats() {
        try {
            const cached = await this.getCachedProperties();
            const timestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
            const cacheAge = timestamp ? Date.now() - parseInt(timestamp) : 0;

            return {
                itemCount: cached.length,
                cacheAge: Math.floor(cacheAge / 1000), // em segundos
                isValid: await this.isCacheValid(),
                size: JSON.stringify(cached).length
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }
}

export default PropertyCacheService; 