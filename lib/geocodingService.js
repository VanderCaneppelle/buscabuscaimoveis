/**
 * Geocoding Service - Busca de endereços e geocodificação
 * Usando APIs gratuitas para evitar dependências pagas
 */

// Token do Mapbox (com fallback hardcoded)
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ||
    'pk.eyJ1IjoidmFuZGVyMDkiLCJhIjoiY21mb2Z2ZjhzMDVsZjJxcTBndXdwang2cyJ9.K2hNqaMqI5hGjuDqdUdvEA';

/**
 * Busca endereços usando Mapbox Geocoding API (melhor cobertura) com fallback para Nominatim
 * @param {string} query - Texto de busca (ex: "Rua Augusta, São Paulo")
 * @param {Object} options - Opções adicionais de busca
 * @returns {Promise<Array>} Lista de endereços encontrados
 */
const searchAddresses = async (query, options = {}) => {
    if (!query || query.trim().length < 3) {
        return [];
    }

    try {
        console.log('🔍 Buscando endereços para:', query);

        // Tentar Mapbox primeiro (melhor cobertura)
        try {
            return await searchAddressesMapbox(query, options);
        } catch (mapboxError) {
            console.warn('⚠️ Mapbox falhou, tentando Nominatim:', mapboxError.message);
            return await searchAddressesNominatim(query, options);
        }

    } catch (error) {
        console.error('❌ Erro na busca de endereços:', error);
        throw new Error('Não foi possível buscar endereços. Verifique sua conexão.');
    }
};

/**
 * Busca endereços usando Mapbox Geocoding API
 */
const searchAddressesMapbox = async (query, options = {}) => {
    if (!MAPBOX_ACCESS_TOKEN) {
        throw new Error('Mapbox token não configurado');
    }

    console.log('🔑 Token Mapbox (busca):', MAPBOX_ACCESS_TOKEN ? `${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...` : 'NÃO CONFIGURADO');

    const params = new URLSearchParams({
        access_token: MAPBOX_ACCESS_TOKEN,
        country: 'br', // Restringir ao Brasil
        language: 'pt',
        limit: options.limit || '5',
        types: 'address,poi', // Endereços e pontos de interesse
    });

    const encodedQuery = encodeURIComponent(`${query}, Brasil`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?${params}`;

    console.log('🗺️ Buscando no Mapbox Geocoding...');
    console.log('🌐 URL Mapbox (busca):', url.replace(MAPBOX_ACCESS_TOKEN, 'TOKEN_OCULTO'));

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Busca BuscaImoveis/1.0',
        },
    });

    console.log('📡 Status Mapbox (busca):', response.status, response.statusText);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP Mapbox (busca):', response.status, errorText);
        throw new Error(`Mapbox API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 Dados Mapbox (busca) recebidos:', {
        features: data.features?.length || 0,
        hasError: !!data.error,
        error: data.error
    });

    if (data.error) {
        console.error('❌ Erro da API Mapbox (busca):', data.error);
        throw new Error(`Mapbox API Error: ${data.error}`);
    }

    console.log('✅ Mapbox: Endereços encontrados:', data?.features?.length || 0);

    return data?.features?.map(item => formatMapboxResult(item)) || [];
};

/**
 * Busca endereços usando OpenStreetMap Nominatim (fallback)
 */
const searchAddressesNominatim = async (query, options = {}) => {
    const params = new URLSearchParams({
        q: `${query}, Brasil`,
        format: 'json',
        addressdetails: '1',
        limit: options.limit || '5',
        countrycodes: 'br',
        'accept-language': 'pt-BR,pt,en'
    });

    const url = `https://nominatim.openstreetmap.org/search?${params}`;

    console.log('🌍 Buscando no Nominatim (fallback)...');

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Busca BuscaImoveis/1.0 (contato@buscabusca.com)',
        },
    });

    if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Nominatim: Endereços encontrados:', data?.length || 0);

    return data?.map(item => formatNominatimResult(item)) || [];
};

/**
 * Geocodifica um endereço específico (converte endereço em coordenadas)
 * @param {string} address - Endereço completo
 * @returns {Promise<Object>} Objeto com coordenadas e endereço formatado
 */
const geocodePropertyAddress = async (address) => {
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
                'User-Agent': 'Busca BuscaImoveis/1.0 (contato@buscabusca.com)',
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
const reverseGeocode = async (latitude, longitude) => {
    if (!latitude || !longitude) {
        throw new Error('Coordenadas inválidas');
    }

    try {
        console.log('🔄 Reverse geocoding:', { latitude, longitude });

        // Função para fazer fetch com timeout
        const fetchWithTimeout = async (url, options = {}, timeout = 8000) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                if (error.name === 'AbortError') {
                    throw new Error('Timeout: operação demorou muito');
                }
                throw error;
            }
        };

        // Tentar Mapbox primeiro
        try {
            console.log('🔑 Token Mapbox:', MAPBOX_ACCESS_TOKEN ? `${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...` : 'NÃO CONFIGURADO');

            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_ACCESS_TOKEN}&language=pt&country=BR`;
            console.log('🌐 URL Mapbox:', url.replace(MAPBOX_ACCESS_TOKEN, 'TOKEN_OCULTO'));

            const response = await fetchWithTimeout(url, {
                headers: {
                    'User-Agent': 'Busca BuscaImoveis/1.0',
                },
            }, 8000);

            console.log('📡 Status Mapbox:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('📊 Dados Mapbox recebidos:', {
                    features: data.features?.length || 0,
                    hasError: !!data.error,
                    error: data.error
                });

                if (data.error) {
                    console.error('❌ Erro da API Mapbox:', data.error);
                    throw new Error(`Mapbox API Error: ${data.error}`);
                }

                if (data.features && data.features.length > 0) {
                    const feature = data.features[0];
                    const components = parseMapboxContext(feature.context || [], feature.properties || {}, feature);

                    const result = {
                        formattedAddress: feature.place_name || '',
                        address: components.street || '',
                        neighborhood: components.neighborhood || '',
                        city: components.city || '',
                        state: components.state || '',
                        zipCode: components.zipCode || '',
                        country: 'Brasil',
                        coordinates: { latitude, longitude }
                    };

                    console.log('✅ Reverse geocoding Mapbox bem-sucedido');
                    return result;
                } else {
                    console.log('⚠️ Mapbox: Nenhum resultado encontrado');
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Erro HTTP Mapbox:', response.status, errorText);
                throw new Error(`Mapbox HTTP Error: ${response.status} - ${errorText}`);
            }
        } catch (mapboxError) {
            console.log('⚠️ Mapbox falhou, tentando Nominatim:', mapboxError.message);
        }

        // Fallback para Nominatim
        const params = new URLSearchParams({
            lat: latitude.toString(),
            lon: longitude.toString(),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'pt-BR,pt,en'
        });

        const url = `https://nominatim.openstreetmap.org/reverse?${params}`;

        const response = await fetchWithTimeout(url, {
            headers: {
                'User-Agent': 'Busca BuscaImoveis/1.0 (contato@buscabusca.com)',
            },
        }, 8000);

        if (!response.ok) {
            throw new Error(`Erro na geocodificação reversa: ${response.status}`);
        }

        const data = await response.json();

        if (!data) {
            throw new Error('Endereço não encontrado para essas coordenadas');
        }

        const result = formatNominatimResult(data);
        console.log('✅ Reverse geocoding Nominatim bem-sucedido');

        return result;

    } catch (error) {
        console.error('❌ Erro no reverse geocoding:', error);
        throw error;
    }
};

/**
 * Formata o resultado da API Mapbox para o formato do app
 * @param {Object} feature - Feature do Mapbox
 * @returns {Object} Endereço formatado
 */
const formatMapboxResult = (feature) => {
    const { geometry, properties, place_name, context } = feature;

    // Extrair componentes do endereço do contexto do Mapbox
    const addressComponents = parseMapboxContext(context || [], properties || {}, feature);

    // Se não temos endereço, extrair do place_name
    let street = addressComponents.street;
    if (!street && place_name) {
        const parts = place_name.split(',');
        street = parts[0]?.trim() || '';
    }

    // Validar coordenadas do Mapbox
    const lat = geometry.coordinates[1];
    const lng = geometry.coordinates[0];
    
    console.log('🔍 DEBUG - Mapbox raw coordinates:', geometry.coordinates);
    console.log('🔍 DEBUG - Mapbox lat:', lat, 'lng:', lng);
    
    if (isNaN(lat) || isNaN(lng)) {
        console.error('❌ ERRO: Coordenadas inválidas do Mapbox:', { lat, lng });
        throw new Error('Coordenadas inválidas do Mapbox');
    }

    const result = {
        // Coordenadas
        coordinates: {
            latitude: lat,
            longitude: lng,
        },

        // Endereço formatado para exibição
        formattedAddress: place_name || 'Endereço não disponível',

        // Componentes separados para salvar no banco
        address: street || properties?.address || '',
        neighborhood: addressComponents.neighborhood || '',
        city: addressComponents.city || '',
        state: addressComponents.state || '',
        zipCode: addressComponents.zipCode || '',
        country: 'Brasil',

        // Metadados
        source: 'mapbox',
        confidence: properties?.accuracy || 'high',
    };

    console.log('🔍 DEBUG - Mapbox result formatado:', result);
    console.log('🔍 DEBUG - Coordinates Mapbox:', result.coordinates);
    console.log('🔍 DEBUG - Latitude Mapbox:', result.coordinates.latitude);
    console.log('🔍 DEBUG - Longitude Mapbox:', result.coordinates.longitude);

    return result;
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

    // Validar coordenadas do Nominatim
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lon);
    
    console.log('🔍 DEBUG - Nominatim raw coordinates:', { lat, lon });
    console.log('🔍 DEBUG - Nominatim parsed lat:', parsedLat, 'lng:', parsedLng);
    
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
        console.error('❌ ERRO: Coordenadas inválidas do Nominatim:', { lat, lon, parsedLat, parsedLng });
        throw new Error('Coordenadas inválidas do Nominatim');
    }

    const result = {
        // Coordenadas
        coordinates: {
            latitude: parsedLat,
            longitude: parsedLng,
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

    console.log('🔍 DEBUG - Nominatim result formatado:', result);
    console.log('🔍 DEBUG - Coordinates Nominatim:', result.coordinates);
    console.log('🔍 DEBUG - Latitude Nominatim:', result.coordinates.latitude);
    console.log('🔍 DEBUG - Longitude Nominatim:', result.coordinates.longitude);

    return result;
};

/**
 * Extrai componentes do endereço do contexto do Mapbox
 * @param {Array} context - Array de contexto do Mapbox
 * @param {Object} properties - Propriedades do feature
 * @param {Object} feature - Feature completo do Mapbox
 * @returns {Object} Componentes organizados do endereço
 */
const parseMapboxContext = (context, properties, feature) => {
    const components = {
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Brasil'
    };

    // Extrair do contexto do Mapbox
    context.forEach(item => {
        const { id, text } = item;

        if (id.includes('address') || id.includes('street')) {
            components.street = text;
        } else if (id.includes('neighborhood') || id.includes('locality') || id.includes('district')) {
            components.neighborhood = text;
        } else if (id.includes('place') || id.includes('city')) {
            components.city = text;
        } else if (id.includes('region') || id.includes('state')) {
            components.state = text;
        } else if (id.includes('postcode')) {
            components.zipCode = text;
        }
    });

    // Tentar extrair endereço de várias fontes do Mapbox
    if (!components.street) {
        if (properties.address) {
            components.street = properties.address;
        } else if (properties.name) {
            components.street = properties.name;
        } else if (feature.place_name) {
            // Extrair primeira parte do place_name como endereço
            const parts = feature.place_name.split(',');
            components.street = parts[0]?.trim() || '';
        }
    }

    // Tentar extrair bairro de várias fontes
    if (!components.neighborhood) {
        if (properties.neighborhood) {
            components.neighborhood = properties.neighborhood;
        } else if (properties.district) {
            components.neighborhood = properties.district;
        }
    }

    // Se não encontrou cidade no contexto, tentar extrair do properties
    if (!components.city && properties.text) {
        components.city = properties.text;
    }

    return components;
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
const isCoordinateInBrazil = (latitude, longitude) => {
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
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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

/**
 * Testa se o token do Mapbox está funcionando
 * @returns {Promise<Object>} Resultado do teste
 */
const testMapboxToken = async () => {
    console.log('🧪 Testando token do Mapbox...');

    if (!MAPBOX_ACCESS_TOKEN) {
        return {
            success: false,
            error: 'Token não configurado',
            details: 'EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN não está definido'
        };
    }

    try {
        // Teste simples com coordenadas do Brasil
        const testUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/-48.673108,-26.91884.json?access_token=${MAPBOX_ACCESS_TOKEN}&language=pt&country=BR`;

        console.log('🔑 Token sendo testado:', `${MAPBOX_ACCESS_TOKEN.substring(0, 20)}...`);
        console.log('🌐 URL de teste:', testUrl.replace(MAPBOX_ACCESS_TOKEN, 'TOKEN_OCULTO'));

        const response = await fetch(testUrl, {
            headers: {
                'User-Agent': 'Busca BuscaImoveis/1.0',
            },
        });

        console.log('📡 Status do teste:', response.status, response.statusText);
        console.log('📡 Headers do teste:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('📊 Resposta do teste:', {
                features: data.features?.length || 0,
                hasError: !!data.error,
                error: data.error
            });

            if (data.error) {
                return {
                    success: false,
                    error: 'Erro da API',
                    details: data.error,
                    status: response.status
                };
            }

            return {
                success: true,
                message: 'Token funcionando corretamente',
                features: data.features?.length || 0
            };
        } else {
            const errorText = await response.text();
            console.error('❌ Erro no teste:', response.status, errorText);

            return {
                success: false,
                error: 'Erro HTTP',
                details: `${response.status} - ${errorText}`,
                status: response.status
            };
        }
    } catch (error) {
        console.error('❌ Erro no teste do token:', error);
        return {
            success: false,
            error: 'Erro de conexão',
            details: error.message
        };
    }
};

// Exportar todas as funções necessárias
export {
    searchAddresses,
    geocodePropertyAddress,
    reverseGeocode,
    isCoordinateInBrazil,
    calculateDistance,
    testMapboxToken
};