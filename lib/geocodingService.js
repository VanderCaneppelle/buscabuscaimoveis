/**
 * Geocoding Service - Busca de endereços e geocodificação
 * Usando APIs gratuitas para evitar dependências pagas
 */

/**
 * Busca endereços usando a API do OpenStreetMap Nominatim (gratuita)
 * @param {string} query - Texto de busca (ex: "Rua Augusta, São Paulo")
 * @param {Object} options - Opções adicionais de busca
 * @returns {Promise<Array>} Lista de endereços encontrados
 */
export const searchAddresses = async (query, options = {}) => {
    if (!query || query.trim().length < 3) {
        return [];
    }

    try {
        console.log('🔍 Buscando endereços para:', query);

        // Usar Nominatim (OpenStreetMap) - API gratuita
        const params = new URLSearchParams({
            q: `${query}, Brasil`,
            format: 'json',
            addressdetails: '1',
            limit: options.limit || '5',
            countrycodes: 'br', // Restringir ao Brasil
            'accept-language': 'pt-BR,pt,en'
        });

        const url = `https://nominatim.openstreetmap.org/search?${params}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'BuscaBuscaImoveis/1.0 (contato@buscabusca.com)', // Identificação obrigatória
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Endereços encontrados:', data?.length || 0);

        return data?.map(item => formatNominatimResult(item)) || [];

    } catch (error) {
        console.error('❌ Erro na busca de endereços:', error);
        throw new Error('Não foi possível buscar endereços. Verifique sua conexão.');
    }
};

/**
 * Geocodifica um endereço específico (converte endereço em coordenadas)
 * @param {string} address - Endereço completo
 * @returns {Promise<Object>} Objeto com coordenadas e endereço formatado
 */
export const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 5) {
        throw new Error('Endereço muito curto para geocodificação');
    }

    try {
        console.log('📍 Geocodificando endereço:', address);

        const params = new URLSearchParams({
            q: `${address}, Brasil`,
            format: 'json',
            addressdetails: '1',
            limit: '1',
            countrycodes: 'br',
            'accept-language': 'pt-BR,pt,en'
        });

        const url = `https://nominatim.openstreetmap.org/search?${params}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BuscaBuscaImoveis/1.0 (contato@buscabusca.com)',
            },
        });

        if (!response.ok) {
            throw new Error(`Erro na geocodificação: ${response.status}`);
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            throw new Error('Endereço não encontrado');
        }

        const result = formatNominatimResult(data[0]);
        console.log('✅ Geocodificação concluída:', result.coordinates);

        return result;

    } catch (error) {
        console.error('❌ Erro na geocodificação:', error);
        throw error;
    }
};

/**
 * Geocodificação reversa (converte coordenadas em endereço)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Objeto com endereço formatado
 */
export const reverseGeocode = async (latitude, longitude) => {
    if (!latitude || !longitude) {
        throw new Error('Coordenadas inválidas');
    }

    try {
        console.log('🔄 Geocodificação reversa:', { latitude, longitude });

        const params = new URLSearchParams({
            lat: latitude.toString(),
            lon: longitude.toString(),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'pt-BR,pt,en'
        });

        const url = `https://nominatim.openstreetmap.org/reverse?${params}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BuscaBuscaImoveis/1.0 (contato@buscabusca.com)',
            },
        });

        if (!response.ok) {
            throw new Error(`Erro na geocodificação reversa: ${response.status}`);
        }

        const data = await response.json();

        if (!data) {
            throw new Error('Endereço não encontrado para essas coordenadas');
        }

        const result = formatNominatimResult(data);
        console.log('✅ Geocodificação reversa concluída:', result.formattedAddress);

        return result;

    } catch (error) {
        console.error('❌ Erro na geocodificação reversa:', error);
        throw error;
    }
};

/**
 * Formata o resultado da API Nominatim para o formato do app
 * @param {Object} item - Item do Nominatim
 * @returns {Object} Endereço formatado
 */
const formatNominatimResult = (item) => {
    const { lat, lon, display_name, address } = item;

    // Extrair componentes do endereço
    const addressComponents = parseNominatimAddress(address || {}, display_name);

    return {
        // Coordenadas
        coordinates: {
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
        },

        // Endereço formatado para exibição
        formattedAddress: display_name || 'Endereço não disponível',

        // Componentes separados para salvar no banco
        address: addressComponents.street || '',
        neighborhood: addressComponents.neighborhood || '',
        city: addressComponents.city || '',
        state: addressComponents.state || '',
        zipCode: addressComponents.zipCode || '',

        // Dados adicionais
        placeType: item.type || 'address',
        importance: item.importance || 0,

        // Dados originais (para debug)
        _raw: item,
    };
};

/**
 * Extrai componentes do endereço do resultado Nominatim
 * @param {Object} address - Objeto address do Nominatim
 * @param {string} displayName - Nome de exibição
 * @returns {Object} Componentes do endereço
 */
const parseNominatimAddress = (address, displayName) => {
    const components = {
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
    };

    if (address) {
        // Rua/Logradouro
        components.street = address.road || address.pedestrian || address.residential || '';

        // Número da casa (se disponível)
        if (address.house_number) {
            components.street = `${components.street}, ${address.house_number}`.trim();
        }

        // Bairro
        components.neighborhood = address.neighbourhood || address.suburb || address.quarter || '';

        // Cidade
        components.city = address.city || address.town || address.village || address.municipality || '';

        // Estado
        components.state = address.state || '';

        // CEP
        components.zipCode = address.postcode || '';
    }

    // Fallback: tentar extrair da string principal
    if (!components.street && displayName) {
        const parts = displayName.split(',').map(part => part.trim());
        if (parts.length > 0) {
            // Pegar apenas a primeira parte (rua + número)
            components.street = parts[0];
        }

        // Tentar extrair cidade e estado dos últimos elementos
        if (parts.length >= 2 && !components.city) {
            components.city = parts[parts.length - 2];
        }
        if (parts.length >= 3 && !components.state) {
            const lastPart = parts[parts.length - 1];
            // Extrair sigla do estado (ex: "São Paulo, SP" -> "SP")
            if (lastPart.includes('SP') || lastPart.includes('RJ') || lastPart.includes('MG')) {
                components.state = lastPart.match(/[A-Z]{2}/)?.[0] || lastPart;
            }
        }
    }

    return components;
};

/**
 * Valida se as coordenadas estão dentro do Brasil (aproximadamente)
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True se estiver no Brasil
 */
export const isCoordinateInBrazil = (latitude, longitude) => {
    // Bounding box aproximado do Brasil
    const BRAZIL_BOUNDS = {
        north: 5.3,
        south: -33.8,
        east: -28.6,
        west: -73.9,
    };

    return (
        latitude >= BRAZIL_BOUNDS.south &&
        latitude <= BRAZIL_BOUNDS.north &&
        longitude >= BRAZIL_BOUNDS.west &&
        longitude <= BRAZIL_BOUNDS.east
    );
};

/**
 * Calcula a distância entre duas coordenadas (em km)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distância em quilômetros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
