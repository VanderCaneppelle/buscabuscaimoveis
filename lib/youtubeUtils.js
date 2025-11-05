/**
 * Utilitários para trabalhar com URLs do YouTube
 */

/**
 * Verifica se uma URL é do YouTube
 * @param {string} url - URL para verificar
 * @returns {boolean} - true se for URL do YouTube
 */
export const isYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
};

/**
 * Verifica se é um YouTube Shorts
 * @param {string} url - URL para verificar
 * @returns {boolean} - true se for YouTube Shorts
 */
export const isYouTubeShorts = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('/shorts/');
};

/**
 * Extrai o ID do vídeo do YouTube de uma URL
 * @param {string} url - URL do YouTube
 * @returns {string|null} - ID do vídeo ou null se não encontrar
 */
export const extractYouTubeVideoId = (url) => {
    if (!url || typeof url !== 'string') return null;

    const patterns = [
        // youtu.be/VIDEO_ID ou youtu.be/VIDEO_ID?params
        /youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|&|$)/,
        // youtube.com/watch?v=VIDEO_ID
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
        // youtube.com/embed/VIDEO_ID
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        // youtube.com/shorts/VIDEO_ID
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        // Fallback mais genérico
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }
    return null;
};

/**
 * Converte URL do YouTube para formato de embed
 * @param {string} url - URL do YouTube
 * @param {object} options - Opções adicionais para o embed
 * @returns {string|null} - URL de embed ou null se inválido
 */
export const getYouTubeEmbedUrl = (url, options = {}) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return null;
    
    // Parâmetros padrão para evitar erro 153
    // Removendo origin para evitar problemas de CORS
    const params = new URLSearchParams({
        autoplay: '0',
        enablejsapi: '1',
        playsinline: '1',
        rel: '0',
        modestbranding: '1',
        controls: '1',
        showinfo: '0',
        ...options
    });
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

/**
 * Valida se uma URL do YouTube é válida e não é Shorts
 * @param {string} url - URL para validar
 * @returns {{ isValid: boolean, error?: string, normalizedUrl?: string }} - Resultado da validação
 */
export const validateYouTubeUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
        return { isValid: false, error: 'URL não pode estar vazia' };
    }

    if (!isYouTubeUrl(url)) {
        return { isValid: false, error: 'URL inválida. Deve ser um link do YouTube' };
    }

    if (isYouTubeShorts(url)) {
        return { isValid: false, error: 'YouTube Shorts não é suportado. Use vídeos normais do YouTube.' };
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
        return { isValid: false, error: 'Não foi possível extrair o ID do vídeo da URL' };
    }

    // Retornar URL normalizada
    const normalizedUrl = normalizeYouTubeUrl(url);
    return { isValid: true, normalizedUrl };
};

/**
 * Normaliza URL do YouTube (remove parâmetros extras)
 * @param {string} url - URL do YouTube
 * @returns {string} - URL normalizada
 */
export const normalizeYouTubeUrl = (url) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) return url;
    return `https://www.youtube.com/watch?v=${videoId}`;
};

