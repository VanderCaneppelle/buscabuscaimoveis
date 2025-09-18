/**
 * Map Service - Operações relacionadas ao mapa
 * Serviço para operações com mapas e formatação de dados para react-native-maps
 */

/**
 * Configurações padrão do mapa
 */
export const MAP_CONFIG = {
    // Coordenadas iniciais (centro do Brasil)
    initialRegion: {
        latitude: -15.7942,
        longitude: -47.8822,
        latitudeDelta: 20,
        longitudeDelta: 20,
    },

    // Configurações de clustering (para implementação futura)
    clustering: {
        enabled: false, // Desabilitado por enquanto
        radius: 50,
        maxZoom: 12,
        minPoints: 2,
    },

    // Tipos de mapa disponíveis
    mapTypes: {
        standard: 'standard',
        satellite: 'satellite',
        hybrid: 'hybrid',
        terrain: 'terrain', // Disponível apenas no Android
    },
};

/**
 * Formatar propriedades para exibição no mapa
 * @param {Array} properties - Lista de propriedades do Supabase
 * @returns {Array} Propriedades formatadas para o mapa
 */
export const formatPropertiesForMap = (properties) => {
    if (!Array.isArray(properties)) {
        console.warn('⚠️ formatPropertiesForMap: properties não é um array');
        return [];
    }

    return properties
        .filter(property => {
            // Filtrar apenas propriedades com coordenadas válidas
            const hasCoordinates =
                property.latitude &&
                property.longitude &&
                !isNaN(property.latitude) &&
                !isNaN(property.longitude);

            if (!hasCoordinates) {
                console.log(`⚠️ Propriedade sem coordenadas: ${property.id}`);
            }

            return hasCoordinates;
        })
        .map(property => ({
            // ID único para o marker
            id: property.id,

            // Coordenadas
            coordinate: {
                latitude: parseFloat(property.latitude),
                longitude: parseFloat(property.longitude),
            },

            // Dados para exibição
            title: property.title || 'Imóvel sem título',
            price: property.price || 0,
            salePrice: property.sale_price || null,
            formattedPrice: formatPrice(property.price, property.sale_price),

            // Endereço
            address: property.address || '',
            neighborhood: property.neighborhood || '',
            city: property.city || '',
            state: property.state || '',

            // Tipo e transação
            propertyType: property.property_type || '',
            transactionType: property.transaction_type || '',

            // Características
            bedrooms: property.bedrooms || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || 0,

            // Imagens
            images: property.images || [],
            thumbnail: property.images?.[0] || null,

            // Status
            status: property.status || 'pending',

            // Dados originais (para navegação)
            _originalData: property,
        }));
};

/**
 * Formatar preço para exibição no marker
 * @param {number} price - Preço original
 * @param {number|null} salePrice - Preço promocional
 * @returns {string} Preço formatado
 */
export const formatPrice = (price, salePrice = null) => {
    const formatCurrency = (value) => {
        if (!value || isNaN(value)) return 'Consulte';

        // Formato mais compacto para markers
        if (value >= 1000000) {
            return `R$ ${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `R$ ${(value / 1000).toFixed(0)}K`;
        }

        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    if (salePrice && salePrice > 0 && salePrice < price) {
        return formatCurrency(salePrice);
    }

    return formatCurrency(price);
};

/**
 * Calcular região do mapa baseada nas propriedades
 * @param {Array} properties - Lista de propriedades formatadas
 * @param {number} padding - Padding em graus (padrão: 0.01)
 * @returns {Object} Região calculada para o mapa
 */
export const calculateMapRegion = (properties, padding = 0.01) => {
    if (!properties || properties.length === 0) {
        return MAP_CONFIG.initialRegion;
    }

    // Se há apenas uma propriedade, centralizar nela
    if (properties.length === 1) {
        const { coordinate } = properties[0];
        return {
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    // Calcular bounding box de todas as propriedades
    let minLat = properties[0].coordinate.latitude;
    let maxLat = properties[0].coordinate.latitude;
    let minLng = properties[0].coordinate.longitude;
    let maxLng = properties[0].coordinate.longitude;

    properties.forEach(property => {
        const { latitude, longitude } = property.coordinate;

        minLat = Math.min(minLat, latitude);
        maxLat = Math.max(maxLat, latitude);
        minLng = Math.min(minLng, longitude);
        maxLng = Math.max(maxLng, longitude);
    });

    // Calcular centro e deltas
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max((maxLat - minLat) + padding, 0.01);
    const deltaLng = Math.max((maxLng - minLng) + padding, 0.01);

    return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: deltaLat,
        longitudeDelta: deltaLng,
    };
};

/**
 * Gerar estilo do marker baseado no tipo de propriedade
 * @param {Object} property - Dados da propriedade
 * @returns {Object} Configurações de estilo do marker
 */
export const getMarkerStyle = (property) => {
    const { propertyType, transactionType, salePrice, price } = property;

    // Cor baseada no tipo de transação
    let backgroundColor = '#059669'; // Verde padrão (venda)

    if (transactionType === 'rent' || transactionType === 'aluguel') {
        backgroundColor = '#3b82f6'; // Azul para aluguel
    } else if (transactionType === 'sale' || transactionType === 'venda') {
        backgroundColor = '#059669'; // Verde para venda
    }

    // Se tem preço promocional, usar cor especial
    if (salePrice && salePrice > 0 && salePrice < price) {
        backgroundColor = '#dc2626'; // Vermelho para promoção
    }

    return {
        backgroundColor,
        borderColor: '#ffffff',
        borderWidth: 2,
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    };
};

/**
 * Validar se uma coordenada é válida
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} True se válida
 */
export const isValidCoordinate = (latitude, longitude) => {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        !isNaN(latitude) &&
        !isNaN(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};

/**
 * Calcular distância entre duas coordenadas (em metros)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distância em metros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
