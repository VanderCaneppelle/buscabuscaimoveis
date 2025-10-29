/**
 * Developer Service
 * Serviço para gerenciar construtoras/incorporadoras
 */

import { supabase } from './supabase';

export const DeveloperService = {
    /**
     * Buscar todas as construtoras ativas
     * @param {Object} options - Opções de busca
     * @param {string} options.search - Termo de busca (nome da construtora)
     * @param {string} options.cityUf - Filtrar por UF
     * @param {string} options.cityName - Filtrar por cidade
     * @returns {Promise<Array>} Lista de construtoras
     */
    async getDevelopers({ search = '', cityUf = '', cityName = '' } = {}) {
        try {
            let query = supabase
                .from('developers')
                .select('*')
                .eq('is_active', true)
                .order('full_name', { ascending: true });

            // Aplicar filtros
            if (search) {
                // Busca em nome completo
                query = query.or(`full_name.ilike.%${search}%,name.ilike.%${search}%`);
            }

            if (cityUf) {
                query = query.eq('city_uf', cityUf);
            }

            if (cityName) {
                query = query.eq('city_name', cityName);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Erro ao buscar construtoras:', error);
            throw error;
        }
    },

    /**
     * Buscar uma construtora por ID
     * @param {string} id - ID da construtora
     * @returns {Promise<Object>} Dados da construtora
     */
    async getDeveloperById(id) {
        try {
            const { data, error } = await supabase
                .from('developers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao buscar construtora:', error);
            throw error;
        }
    },

    /**
     * Buscar construtoras agrupadas por UF (para dropdowns hierárquicos)
     * @returns {Promise<Object>} Construtoras agrupadas por estado
     */
    async getDevelopersByState() {
        try {
            const { data, error } = await supabase
                .from('developers')
                .select('*')
                .eq('is_active', true)
                .not('city_uf', 'is', null)
                .order('city_uf', { ascending: true })
                .order('full_name', { ascending: true });

            if (error) throw error;

            // Agrupar por UF
            const grouped = {};
            data.forEach(developer => {
                const uf = developer.city_uf;
                if (!grouped[uf]) {
                    grouped[uf] = [];
                }
                grouped[uf].push(developer);
            });

            return grouped;
        } catch (error) {
            console.error('Erro ao buscar construtoras por estado:', error);
            throw error;
        }
    },

    /**
     * Buscar lista de UFs disponíveis
     * @returns {Promise<Array>} Lista de UFs únicas
     */
    async getAvailableStates() {
        try {
            const { data, error } = await supabase
                .from('developers')
                .select('city_uf')
                .eq('is_active', true)
                .not('city_uf', 'is', null);

            if (error) throw error;

            // Remover duplicatas e ordenar
            const uniqueStates = [...new Set(data.map(d => d.city_uf))];
            return uniqueStates.sort();
        } catch (error) {
            console.error('Erro ao buscar estados:', error);
            throw error;
        }
    },

    /**
     * Buscar lista de cidades por UF
     * @param {string} uf - Estado (UF)
     * @returns {Promise<Array>} Lista de cidades
     */
    async getCitiesByState(uf) {
        try {
            const { data, error } = await supabase
                .from('developers')
                .select('city_name')
                .eq('is_active', true)
                .eq('city_uf', uf)
                .not('city_name', 'is', null);

            if (error) throw error;

            // Remover duplicatas e ordenar
            const uniqueCities = [...new Set(data.map(d => d.city_name))];
            return uniqueCities.sort();
        } catch (error) {
            console.error('Erro ao buscar cidades:', error);
            throw error;
        }
    },

    /**
     * Criar nova construtora (admin ou usuário futuro)
     * @param {Object} developerData - Dados da construtora
     * @returns {Promise<Object>} Construtora criada
     */
    async createDeveloper(developerData) {
        try {
            const { data, error } = await supabase
                .from('developers')
                .insert([developerData])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Construtora criada:', data);
            return data;
        } catch (error) {
            console.error('Erro ao criar construtora:', error);
            throw error;
        }
    },

    /**
     * Atualizar construtora
     * @param {string} id - ID da construtora
     * @param {Object} updates - Dados a atualizar
     * @returns {Promise<Object>} Construtora atualizada
     */
    async updateDeveloper(id, updates) {
        try {
            const { data, error } = await supabase
                .from('developers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Construtora atualizada:', data);
            return data;
        } catch (error) {
            console.error('Erro ao atualizar construtora:', error);
            throw error;
        }
    },

    /**
     * Desativar construtora (soft delete)
     * @param {string} id - ID da construtora
     * @returns {Promise<boolean>} Sucesso
     */
    async deactivateDeveloper(id) {
        try {
            const { error } = await supabase
                .from('developers')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;

            console.log('✅ Construtora desativada');
            return true;
        } catch (error) {
            console.error('Erro ao desativar construtora:', error);
            throw error;
        }
    },

    /**
     * Buscar construtoras com cache simples
     * Útil para dropdowns que são usados frequentemente
     */
    _cache: null,
    _cacheTime: null,
    _cacheDuration: 5 * 60 * 1000, // 5 minutos

    async getDevelopersWithCache() {
        const now = Date.now();
        
        // Se tem cache válido, retornar
        if (this._cache && this._cacheTime && (now - this._cacheTime) < this._cacheDuration) {
            console.log('📦 Usando cache de construtoras');
            return this._cache;
        }

        // Buscar dados frescos
        const developers = await this.getDevelopers();
        this._cache = developers;
        this._cacheTime = now;

        return developers;
    },

    /**
     * Limpar cache
     */
    clearCache() {
        this._cache = null;
        this._cacheTime = null;
        console.log('🗑️ Cache de construtoras limpo');
    },

    /**
     * Buscar construtoras que têm imóveis ativos (para filtro na HomeScreen)
     * @param {Object} options - Opções de busca
     * @param {string} options.search - Termo de busca (nome da construtora)
     * @returns {Promise<Array>} Lista de construtoras com quantidade de imóveis
     */
    async getDevelopersWithProperties({ search = '' } = {}) {
        try {
            console.log('🌐 DeveloperService: Buscando construtoras com imóveis...');

            // Buscar construtoras com imóveis ativos usando RPC
            const { data, error } = await supabase.rpc('get_developers_with_properties');

            if (error) {
                console.error('❌ Erro ao buscar construtoras com imóveis:', error);
                throw error;
            }

            console.log(`✅ ${data?.length || 0} construtoras com imóveis encontradas`);

            // Aplicar busca se necessário
            if (search && data) {
                const searchLower = search.toLowerCase();
                return data.filter(developer =>
                    developer.full_name?.toLowerCase().includes(searchLower) ||
                    developer.name?.toLowerCase().includes(searchLower) ||
                    developer.city_name?.toLowerCase().includes(searchLower)
                );
            }

            return data || [];

        } catch (error) {
            console.error('❌ DeveloperService: Erro ao buscar construtoras:', error);
            throw error;
        }
    }
};

