import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const CACHE_KEY_PREFIX = 'properties_cache';
const CACHE_TIMESTAMP_PREFIX = 'properties_cache_timestamp';
const CACHE_LAST_UPDATE_PREFIX = 'properties_cache_last_update'; // ✨ Timestamp do servidor
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const PAGE_SIZE = 15; // Propriedades por página

function normalizeFilters(filters = {}) {
    // Garantir ordem estável das chaves para chave consistente
    const { 
        city = '', 
        propertyType = [], 
        minPrice = '', 
        maxPrice = '',
        // ✨ NOVOS FILTROS
        userType = 'all', // 'all' | 'developer' | 'realtor' | 'owner'
        developerId = null,
        realtorId = null
    } = filters || {};
    // Normalizar propertyType para array se for string
    const normalizedPropertyType = Array.isArray(propertyType) ? propertyType : (propertyType ? [propertyType] : []);
    return { 
        city, 
        propertyType: normalizedPropertyType, 
        minPrice, 
        maxPrice,
        userType,
        developerId,
        realtorId
    };
}

function buildCacheKey(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0) {
    const normalized = normalizeFilters(filters);
    const base = JSON.stringify({ f: normalized, q: searchTerm || '', s: sortOption, p: page });
    // Evitar chaves muito grandes
    const hash = typeof base === 'string' ? base : JSON.stringify(base);
    return `${CACHE_KEY_PREFIX}:${hash}`;
}

function buildTimestampKey(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0) {
    const normalized = normalizeFilters(filters);
    const base = JSON.stringify({ f: normalized, q: searchTerm || '', s: sortOption, p: page });
    const hash = typeof base === 'string' ? base : JSON.stringify(base);
    return `${CACHE_TIMESTAMP_PREFIX}:${hash}`;
}

function buildCountKey(filters = {}, searchTerm = '', sortOption = 'date_desc') {
    const normalized = normalizeFilters(filters);
    const base = JSON.stringify({ f: normalized, q: searchTerm || '', s: sortOption });
    const hash = typeof base === 'string' ? base : JSON.stringify(base);
    return `${CACHE_KEY_PREFIX}:count:${hash}`;
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
            enableParallelUpdate = true, // Nova opção para atualização em paralelo
            sortOption = 'date_desc'
        } = options;

        console.log('🚀🚀🚀 PropertyCacheService: INICIANDO BUSCA DE PROPRIEDADES 🚀🚀🚀');
        console.log('📋 Parâmetros:', { page, filters, searchTerm, forceRefresh, pageSize, enableParallelUpdate, sortOption });

        try {
            const cachedData = await this.getCachedProperties(filters, searchTerm, sortOption, page);
            const hasCached = Array.isArray(cachedData) && cachedData.length > 0;

            // ✨ Se não é forceRefresh e tem cache, usar checagem inteligente
            if (!forceRefresh && hasCached) {
                console.log('📦 PropertyCacheService: Cache encontrado, fazendo checagem inteligente...');
                
                const revalidation = await this.needsRevalidation(filters, searchTerm, sortOption, page);
                console.log('🔍 PropertyCacheService: Resultado da checagem:', revalidation);

                // Se não precisa atualizar, retornar cache
                if (!revalidation.needsUpdate) {
                    console.log('📦📦📦 PropertyCacheService: USANDO CACHE (Smart Revalidation) 📦📦📦');
                    
                    if (revalidation.renewed) {
                        console.log('🔄 PropertyCacheService: Cache renovado por mais 5 minutos');
                    }

                    return {
                        data: cachedData,
                        totalCount: await this.getCachedTotalCount(filters, searchTerm, sortOption),
                        hasMore: cachedData.length === pageSize,
                        fromCache: true,
                        smartRevalidation: true,
                        revalidationInfo: revalidation
                    };
                }
                
                // Se precisa atualizar, continuar para buscar do servidor
                console.log(`🔄 PropertyCacheService: Cache precisa atualizar (${revalidation.reason})`);
            }

            // Se cache não é válido ou forceRefresh, buscar do servidor
            console.log('🌐🌐🌐 PropertyCacheService: BUSCANDO DO SERVIDOR 🌐🌐🌐');
            const serverResp = await this.fetchFromServer(filters, searchTerm, sortOption, page, pageSize);
            console.log(`🌐 PropertyCacheService: ${serverResp.data.length} propriedades recebidas do servidor (page ${page})`);

            // Salvar no cache
            await this.saveToCache(serverResp.data, filters, searchTerm, sortOption, page, serverResp.totalCount);
            console.log('💾 PropertyCacheService: Dados salvos no cache');

            const paginatedData = serverResp.data;
            const from = serverResp.from ?? page * pageSize;
            const loadedUntil = from + paginatedData.length;
            console.log(`📄 PropertyCacheService: Página ${page}: ${paginatedData.length} propriedades (from ${from}) totalCount ${serverResp.totalCount}`);

            console.log('✅✅✅ PropertyCacheService: RETORNANDO DADOS DO SERVIDOR ✅✅✅');

            return {
                data: paginatedData,
                totalCount: serverResp.totalCount,
                hasMore: loadedUntil < serverResp.totalCount,
                fromCache: false,
                serverInfo: {
                    totalReceived: serverResp.data.length,
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
     * ✨ Checagem inteligente: Verificar se dados mudaram no servidor (MAX(updated_at))
     */
    static async checkForServerChanges() {
        try {
            console.log('🔍 PropertyCacheService: Checando mudanças no servidor...');
            
            const { data, error } = await supabase
                .from('properties')
                .select('updated_at')
                .eq('status', 'approved')
                .eq('ad_status', 'active')
                .order('updated_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('❌ PropertyCacheService: Erro ao checar mudanças:', error);
                return null;
            }

            const serverLastUpdate = data?.[0]?.updated_at || null;
            console.log('📡 PropertyCacheService: Última atualização do servidor:', serverLastUpdate);
            return serverLastUpdate;
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao checar mudanças:', error);
            return null;
        }
    }

    /**
     * ✨ Verificar se cache precisa ser atualizado (smart revalidation)
     */
    static async needsRevalidation(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0) {
        try {
            // 1. Verificar se cache expirou (tempo)
            const tsKey = buildTimestampKey(filters, searchTerm, sortOption, page);
            const timestamp = await AsyncStorage.getItem(tsKey);
            
            if (!timestamp) {
                console.log('📦 PropertyCacheService: Sem cache, precisa buscar');
                return { needsUpdate: true, reason: 'no_cache' };
            }

            const cacheAge = Date.now() - parseInt(timestamp);
            const isExpired = cacheAge >= CACHE_DURATION;

            console.log(`📦 PropertyCacheService: Cache age: ${Math.floor(cacheAge / 1000)}s`);

            // 2. Se cache não expirou, está válido
            if (!isExpired) {
                console.log('✅ PropertyCacheService: Cache ainda válido');
                return { needsUpdate: false, reason: 'cache_valid' };
            }

            // 3. Cache expirou, fazer checagem inteligente
            console.log('⏰ PropertyCacheService: Cache expirou, fazendo checagem inteligente...');
            
            const lastUpdateKey = `${CACHE_LAST_UPDATE_PREFIX}:${buildCacheKey(filters, searchTerm, sortOption, page)}`;
            const cachedServerUpdate = await AsyncStorage.getItem(lastUpdateKey);
            
            const serverLastUpdate = await this.checkForServerChanges();
            
            if (!serverLastUpdate) {
                // Erro na checagem, atualizar por segurança
                console.log('⚠️ PropertyCacheService: Erro na checagem, atualizando por segurança');
                return { needsUpdate: true, reason: 'check_failed' };
            }

            // 4. Comparar timestamps
            if (cachedServerUpdate === serverLastUpdate) {
                console.log('✅ PropertyCacheService: Sem mudanças no servidor, renovando cache');
                // Renovar timestamp do cache (mantém dados por mais 5 min)
                await AsyncStorage.setItem(tsKey, Date.now().toString());
                return { needsUpdate: false, reason: 'no_changes', renewed: true };
            } else {
                console.log('🔄 PropertyCacheService: Detectou mudanças no servidor, precisa atualizar');
                return { needsUpdate: true, reason: 'server_changed' };
            }
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro na checagem inteligente:', error);
            return { needsUpdate: true, reason: 'error' };
        }
    }

    /**
     * Verificar se o cache ainda é válido (método legado, mantido para compatibilidade)
     */
    static async isCacheValid(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0) {
        try {
            const tsKey = buildTimestampKey(filters, searchTerm, sortOption, page);
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
    static async fetchFromServer(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0, pageSize = PAGE_SIZE) {
        console.log('🌐 PropertyCacheService: Iniciando busca no servidor');
        console.log('🔍 Filtros aplicados:', filters);
        console.log('🔍 Termo de busca:', searchTerm || 'Nenhum');

        let query = supabase
            .from('properties')
            .select('*, images', { count: 'exact' })
            .eq('status', 'approved')
            .eq('ad_status', 'active');

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
        if (filters.propertyType && filters.propertyType.length > 0) {
            console.log(`🏠 Filtrando por tipos: "${filters.propertyType.join(', ')}"`);
            query = query.in('property_type', filters.propertyType);
        }
        if (filters.minPrice) {
            console.log(`💰 Preço mínimo: R$ ${filters.minPrice}`);
            query = query.gte('price', parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            console.log(`💰 Preço máximo: R$ ${filters.maxPrice}`);
            query = query.lte('price', parseFloat(filters.maxPrice));
        }

        // ✨ NOVOS FILTROS: userType, developerId, realtorId
        if (filters.userType && filters.userType !== 'all') {
            console.log(`👤 Filtrando por tipo de usuário: "${filters.userType}"`);
            
            if (filters.userType === 'developer' && filters.developerId) {
                // Filtrar por construtora específica
                console.log(`🏗️ Filtrando por construtora ID: ${filters.developerId}`);
                query = query.eq('developer_id', filters.developerId);
            } 
            else if (filters.userType === 'realtor' && filters.realtorId) {
                // Filtrar por corretor específico
                console.log(`🏢 Filtrando por corretor ID: ${filters.realtorId}`);
                query = query.eq('user_id', filters.realtorId);
            } 
            else if (filters.userType === 'owner') {
                // Filtrar por proprietários (não corretores)
                // Precisa fazer JOIN com profiles para verificar is_realtor
                // Como não podemos fazer JOIN direto, vamos usar uma subquery via RPC
                console.log(`🏠 Filtrando por proprietários (não corretores)`);
                // Solução alternativa: buscar profiles com is_realtor=false ou null
                // e depois filtrar user_ids
                const { data: ownerProfiles } = await supabase
                    .from('profiles')
                    .select('id')
                    .or('is_realtor.is.null,is_realtor.eq.false');
                
                if (ownerProfiles && ownerProfiles.length > 0) {
                    const ownerIds = ownerProfiles.map(p => p.id);
                    query = query.in('user_id', ownerIds);
                } else {
                    // Se não encontrar nenhum proprietário, retornar vazio
                    console.log('⚠️ Nenhum proprietário encontrado');
                    return { data: [], totalCount: 0, from: 0, to: 0 };
                }
            }
        }

        // Ordenação no servidor (estável com tie-break por id)
        switch (sortOption) {
            case 'price_asc':
                query = query.order('price', { ascending: true, nullsFirst: false })
                    .order('id', { ascending: false });
                break;
            case 'price_desc':
                query = query.order('price', { ascending: false, nullsFirst: true })
                    .order('id', { ascending: false });
                break;
            case 'date_asc':
                query = query.order('created_at', { ascending: true })
                    .order('id', { ascending: true });
                break;
            case 'date_desc':
            default:
                query = query.order('created_at', { ascending: false })
                    .order('id', { ascending: false });
                break;
        }

        // Paginação no servidor (range depois de ordenar)
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await query.range(from, to);

        if (error) {
            console.error('❌ PropertyCacheService: Erro na consulta do servidor:', error);
            throw new Error(`Erro ao buscar propriedades: ${error.message}`);
        }

        console.log(`🌐 PropertyCacheService: Sucesso! ${data?.length || 0} propriedades recebidas do servidor`);
        return { data: data || [], totalCount: count ?? 0, from, to };
    }

    /**
     * Salvar dados no cache
     */
    static async saveToCache(data, filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0, totalCount = null) {
        try {
            console.log(`💾 PropertyCacheService: Salvando ${data.length} propriedades no cache`);
            const key = buildCacheKey(filters, searchTerm, sortOption, page);
            const tsKey = buildTimestampKey(filters, searchTerm, sortOption, page);
            const lastUpdateKey = `${CACHE_LAST_UPDATE_PREFIX}:${key}`;
            
            await AsyncStorage.setItem(key, JSON.stringify(data));
            await AsyncStorage.setItem(tsKey, Date.now().toString());
            
            if (typeof totalCount === 'number') {
                const countKey = buildCountKey(filters, searchTerm, sortOption);
                await AsyncStorage.setItem(countKey, totalCount.toString());
            }
            
            // ✨ Salvar timestamp do servidor (MAX(updated_at))
            const serverLastUpdate = await this.checkForServerChanges();
            if (serverLastUpdate) {
                await AsyncStorage.setItem(lastUpdateKey, serverLastUpdate);
                console.log('💾 PropertyCacheService: Timestamp do servidor salvo:', serverLastUpdate);
            }
            
            this.lastFetchTime = Date.now();
            console.log('💾 PropertyCacheService: Cache atualizado com sucesso');
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao salvar cache:', error);
        }
    }

    /**
     * Obter dados do cache
     */
    static async getCachedProperties(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0) {
        try {
            const key = buildCacheKey(filters, searchTerm, sortOption, page);
            const cached = await AsyncStorage.getItem(key);
            const data = cached ? JSON.parse(cached) : [];
            console.log(`📦 PropertyCacheService: Lendo cache - ${data.length} propriedades encontradas`);
            return data;
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro ao ler cache:', error);
            return [];
        }
    }

    static async getCachedTotalCount(filters = {}, searchTerm = '', sortOption = 'date_desc') {
        try {
            const countKey = buildCountKey(filters, searchTerm, sortOption);
            const val = await AsyncStorage.getItem(countKey);
            return val ? parseInt(val, 10) : 0;
        } catch (error) {
            return 0;
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

        if (filters.propertyType && filters.propertyType.length > 0) {
            filteredData = filteredData.filter(item =>
                filters.propertyType.includes(item.property_type)
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

        // ✨ NOVOS FILTROS: userType, developerId, realtorId
        if (filters.userType && filters.userType !== 'all') {
            if (filters.userType === 'developer' && filters.developerId) {
                filteredData = filteredData.filter(item =>
                    item.developer_id === filters.developerId
                );
            } else if (filters.userType === 'realtor' && filters.realtorId) {
                filteredData = filteredData.filter(item =>
                    item.user_id === filters.realtorId
                );
            }
            // NOTA: filtro 'owner' não é aplicado aqui pois precisa de dados de profiles
            // que não estão no cache de propriedades
        }

        return filteredData;
    }

    /**
     * Aplicar ordenação local (fallback caso necessário)
     */
    static applySort(data, sortOption = 'date_desc') {
        const copy = [...data];
        switch (sortOption) {
            case 'price_asc':
                return copy.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
            case 'price_desc':
                return copy.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
            case 'date_asc':
                return copy.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'date_desc':
            default:
                return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
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
     * Limpar cache (em memória + AsyncStorage)
     */
    static async clearCache() {
        try {
            // Limpar cache em memória
            this.cache.clear();
            this.lastFetchTime = 0;
            
            // Limpar AsyncStorage (todas as chaves de propriedades)
            const keys = await AsyncStorage.getAllKeys();
            const propertyKeys = keys.filter(key => 
                key.startsWith(CACHE_KEY_PREFIX) || 
                key.startsWith(CACHE_TIMESTAMP_PREFIX) ||
                key.startsWith(CACHE_LAST_UPDATE_PREFIX)
            );
            
            if (propertyKeys.length > 0) {
                await AsyncStorage.multiRemove(propertyKeys);
                console.log(`🗑️ Cache de propriedades limpo: ${propertyKeys.length} chaves removidas do AsyncStorage`);
            } else {
                console.log('🗑️ Cache de propriedades limpo (nenhuma chave no AsyncStorage)');
            }
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
    static async updateCacheInBackground(filters = {}, searchTerm = '', sortOption = 'date_desc', page = 0, pageSize = PAGE_SIZE) {
        try {
            console.log('🔄 PropertyCacheService: Iniciando atualização em background...');
            const serverResp = await this.fetchFromServer(filters, searchTerm, sortOption, page, pageSize);
            await this.saveToCache(serverResp.data, filters, searchTerm, sortOption, page, serverResp.totalCount);
            console.log('✅ PropertyCacheService: Cache atualizado em background');
        } catch (error) {
            console.error('❌ PropertyCacheService: Erro na atualização em background:', error);
        }
    }
}

export default PropertyCacheService; 