import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY_PREFIX = 'properties_cache';
const CACHE_TIMESTAMP_PREFIX = 'properties_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const PAGE_SIZE = 15; // Propriedades por página

function normalizeFilters(filters = {}) {
    // Garantir ordem estável das chaves para chave consistente
    const { city = '', propertyType = '', minPrice = '', maxPrice = '' } = filters || {};
    return { city, propertyType, minPrice, maxPrice };
}

function buildCacheKey(filters = {}, searchTerm = '') {
    const normalized = normalizeFilters(filters);
    const base = JSON.stringify({ f: normalized, q: searchTerm || '' });
    // Evitar chaves muito grandes
    const hash = typeof base === 'string' ? base : JSON.stringify(base);
    return `${CACHE_KEY_PREFIX}:${hash}`;
}

function buildTimestampKey(filters = {}, searchTerm = '') {
    const normalized = normalizeFilters(filters);
    const base = JSON.stringify({ f: normalized, q: searchTerm || '' });
    const hash = typeof base === 'string' ? base : JSON.stringify(base);
    return `${CACHE_TIMESTAMP_PREFIX}:${hash}`;
}

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
            pageSize = PAGE_SIZE,
            enableParallelUpdate = true // Nova opção para atualização em paralelo
        } = options;

        console.log('🚀🚀🚀 PropertyCacheService: INICIANDO BUSCA DE PROPRIEDADES 🚀🚀🚀');
        console.log('📋 Parâmetros:', { page, filters, searchTerm, forceRefresh, pageSize, enableParallelUpdate });

        try {
            // Verificar validade do cache e presença de dados
            const cacheValid = await this.isCacheValid(filters, searchTerm);
            console.log('🔍 PropertyCacheService: Cache válido?', cacheValid);
            console.log('🔍 PropertyCacheService: Force refresh?', forceRefresh);

            const cachedData = await this.getCachedProperties(filters, searchTerm);
            const hasCached = Array.isArray(cachedData) && cachedData.length > 0;

            // Estratégia SWR condicional
            // - Se houver cache e não for forceRefresh: retorna cache imediatamente
            // - Se cache estiver expirado e enableParallelUpdate: revalida em background
            if (!forceRefresh && hasCached) {
                console.log('📦📦📦 PropertyCacheService: USANDO CACHE LOCAL (SWR condicional) 📦📦📦');

                const filteredData = this.applyFiltersAndSearch(cachedData, filters, searchTerm);
                const paginatedData = this.applyPagination(filteredData, page, pageSize);

                if (enableParallelUpdate && !cacheValid) {
                    this.updateCacheInBackground(filters, searchTerm).catch(error => {
                        console.log('⚠️ PropertyCacheService: Erro na atualização em background:', error);
                    });
                }

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

            // Se cache não é válido ou forceRefresh, buscar do servidor
            console.log('🌐🌐🌐 PropertyCacheService: BUSCANDO DO SERVIDOR 🌐🌐🌐');
            const serverData = await this.fetchFromServer(filters, searchTerm);
            console.log(`🌐 PropertyCacheService: ${serverData.length} propriedades recebidas do servidor`);

            // Salvar no cache
            await this.saveToCache(serverData, filters, searchTerm);
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
                const cachedData = await this.getCachedProperties(filters, searchTerm);
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
                throw cacheError;
            }
        }
    }

    /**
     * Verificar se o cache ainda é válido
     */
    static async isCacheValid(filters = {}, searchTerm = '') {
        try {
            const tsKey = buildTimestampKey(filters, searchTerm);
            const timestamp = await AsyncStorage.getItem(tsKey);
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
    static async saveToCache(data, filters = {}, searchTerm = '') {
        try {
            console.log(`💾 PropertyCacheService: Salvando ${data.length} propriedades no cache`);
            const key = buildCacheKey(filters, searchTerm);
            const tsKey = buildTimestampKey(filters, searchTerm);
            await AsyncStorage.setItem(key, JSON.stringify(data));
            await AsyncStorage.setItem(tsKey, Date.now().toString());
            this.lastFetchTime = Date.now();
            console.log('💾 PropertyCacheService: Cache atualizado com sucesso');
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao salvar cache:', error);
        }
    }

    /**
     * Obter dados do cache
     */
    static async getCachedProperties(filters = {}, searchTerm = '') {
        try {
            const key = buildCacheKey(filters, searchTerm);
            const cached = await AsyncStorage.getItem(key);
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
            // Limpeza simples: como usamos chaves por prefixo, em produção poderíamos listar
            // todas as chaves e remover as que iniciam com os prefixos. Aqui, mantemos básico.
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
    static async refreshCache(filters = {}, searchTerm = '') {
        try {
            console.log('🔄 Forçando atualização do cache');
            const data = await this.fetchFromServer(filters, searchTerm);
            await this.saveToCache(data, filters, searchTerm);
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar cache:', error);
            throw error;
        }
    }

    /**
     * Obter estatísticas do cache
     */
    static async getCacheStats(filters = {}, searchTerm = '') {
        try {
            const cached = await this.getCachedProperties(filters, searchTerm);
            const tsKey = buildTimestampKey(filters, searchTerm);
            const timestamp = await AsyncStorage.getItem(tsKey);
            const cacheAge = timestamp ? Date.now() - parseInt(timestamp) : 0;

            return {
                itemCount: cached.length,
                cacheAge: Math.floor(cacheAge / 1000), // em segundos
                isValid: await this.isCacheValid(filters, searchTerm),
                size: JSON.stringify(cached).length
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }

    /**
     * Atualizar cache em background sem bloquear a resposta
     */
    static async updateCacheInBackground(filters = {}, searchTerm = '') {
        try {
            console.log('🔄 PropertyCacheService: Iniciando atualização em background...');
            const serverData = await this.fetchFromServer(filters, searchTerm);
            await this.saveToCache(serverData, filters, searchTerm);
            console.log('✅ PropertyCacheService: Cache atualizado em background');
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro na atualização em background:', error);
        }
    }
}

export default PropertyCacheService; 