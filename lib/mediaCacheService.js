import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.documentDirectory}media_cache/`;
const CACHE_METADATA_KEY = 'media_cache_metadata';
const MAX_CACHE_SIZE_MB = 500; // Limite total de 500MB
const STORY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas para stories
const GENERAL_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias para outros

// Criar diretório de cache se não existir
const ensureCacheDirectory = async () => {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        console.log('📁 Diretório de cache criado:', CACHE_DIR);
    }
};

// Gerar nome do arquivo baseado na URL
const getFileNameFromUrl = (url) => {
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    // Adicionar hash da URL para evitar conflitos
    const urlHash = url.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0).toString(36);
    return `${urlHash}_${fileName}`;
};

// Verificar se arquivo existe no cache
const isFileCached = async (url) => {
    try {
        const fileName = getFileNameFromUrl(url);
        const filePath = `${CACHE_DIR}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        return fileInfo.exists;
    } catch (error) {
        console.error('❌ Erro ao verificar cache:', error);
        return false;
    }
};

// Obter caminho do arquivo em cache
const getCachedFilePath = (url) => {
    const fileName = getFileNameFromUrl(url);
    return `${CACHE_DIR}${fileName}`;
};

// Verificar se URL é de story (baseado no contexto ou URL)
const isStoryUrl = (url, fileType) => {
    // Verificar se é vídeo (stories são sempre vídeos)
    if (fileType === 'video' || fileType === 'story') return true;

    // Verificar se URL contém indicadores de story
    return url.includes('stories') || url.includes('story') || url.includes('thumbnail');
};

// Baixar e salvar arquivo no cache
const downloadAndCacheFile = async (url, fileType = 'media') => {
    try {
        await ensureCacheDirectory();

        const fileName = getFileNameFromUrl(url);
        const filePath = `${CACHE_DIR}${fileName}`;

        console.log(`📥 Baixando ${fileType}:`, url);
        console.log(`💾 Salvando em:`, filePath);

        const downloadResult = await FileSystem.downloadAsync(url, filePath);

        if (downloadResult.status === 200) {
            console.log(`✅ ${fileType} salvo no cache:`, fileName);

            // Obter tamanho do arquivo do sistema de arquivos
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            const fileSize = fileInfo.exists ? fileInfo.size : 0;
            console.log(`📏 Tamanho do arquivo: ${fileSize} bytes`);

            // Verificar se excede limite de cache
            await checkAndCleanupCacheIfNeeded(fileSize);

            // Salvar metadados do cache
            await updateCacheMetadata(url, filePath, fileSize, fileType);

            return filePath;
        } else {
            console.error(`❌ Erro ao baixar ${fileType}:`, downloadResult.status);
            return url; // Fallback para URL original
        }
    } catch (error) {
        console.error(`❌ Erro ao baixar ${fileType}:`, error);
        return url; // Fallback para URL original
    }
};

// Verificar e limpar cache se necessário
const checkAndCleanupCacheIfNeeded = async (newFileSize) => {
    try {
        const stats = await getCacheStats();
        const currentSizeMB = parseFloat(stats.totalSizeMB);
        const newFileSizeMB = newFileSize / (1024 * 1024);

        // Se adicionar este arquivo excederia o limite
        if (currentSizeMB + newFileSizeMB > MAX_CACHE_SIZE_MB) {
            console.log(`⚠️ Cache próximo do limite (${currentSizeMB.toFixed(2)}MB + ${newFileSizeMB.toFixed(2)}MB > ${MAX_CACHE_SIZE_MB}MB)`);
            await cleanupCacheByPriority();
        }
    } catch (error) {
        console.error('❌ Erro ao verificar limite de cache:', error);
    }
};

// Limpar cache por prioridade (menos acessados primeiro)
const cleanupCacheByPriority = async () => {
    try {
        const metadata = await getCacheMetadata();
        const entries = Object.entries(metadata);

        // Ordenar por último acesso (mais antigos primeiro)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        let freedSpace = 0;
        const targetSpace = 100 * 1024 * 1024; // Liberar 100MB

        for (const [url, info] of entries) {
            if (freedSpace >= targetSpace) break;

            try {
                const fileInfo = await FileSystem.getInfoAsync(info.filePath);
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(info.filePath);
                    freedSpace += info.fileSize || 0;
                    console.log(`🗑️ Arquivo removido por prioridade: ${info.filePath}`);
                }
                delete metadata[url];
            } catch (error) {
                console.error('❌ Erro ao remover arquivo:', error);
            }
        }

        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
        console.log(`🧹 Cache limpo por prioridade: ${(freedSpace / (1024 * 1024)).toFixed(2)}MB liberados`);
    } catch (error) {
        console.error('❌ Erro ao limpar cache por prioridade:', error);
    }
};

// Atualizar metadados do cache
const updateCacheMetadata = async (url, filePath, fileSize, fileType = 'media') => {
    try {
        const metadata = await getCacheMetadata();
        const isStory = isStoryUrl(url, fileType);

        metadata[url] = {
            filePath,
            fileSize: parseInt(fileSize) || 0,
            fileType,
            isStory,
            cachedAt: Date.now(),
            lastAccessed: Date.now()
        };
        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
        console.error('❌ Erro ao atualizar metadados do cache:', error);
    }
};

// Obter metadados do cache
const getCacheMetadata = async () => {
    try {
        const metadata = await AsyncStorage.getItem(CACHE_METADATA_KEY);
        return metadata ? JSON.parse(metadata) : {};
    } catch (error) {
        console.error('❌ Erro ao obter metadados do cache:', error);
        return {};
    }
};

// Verificar se arquivo expirou
const isFileExpired = (metadata) => {
    const now = Date.now();
    const isStory = metadata.isStory;
    const cacheDuration = isStory ? STORY_CACHE_DURATION : GENERAL_CACHE_DURATION;

    return (now - metadata.cachedAt) > cacheDuration;
};

// Obter URL otimizada (cache ou original)
const getOptimizedUrl = async (url, fileType = 'media') => {
    if (!url) return null;

    try {
        // Verificar se arquivo está em cache
        const isCached = await isFileCached(url);

        if (isCached) {
            const cachedPath = getCachedFilePath(url);
            const metadata = await getCacheMetadata();

            // Verificar se expirou
            if (metadata[url] && isFileExpired(metadata[url])) {
                console.log(`⏰ ${fileType} expirado, removendo do cache:`, url);
                await removeFromCache(url);
                // Baixar novamente
                return await downloadAndCacheFile(url, fileType);
            }

            console.log(`📦 Usando ${fileType} do cache:`, cachedPath);

            // Atualizar último acesso
            if (metadata[url]) {
                metadata[url].lastAccessed = Date.now();
                await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
            }

            return cachedPath;
        } else {
            // Baixar e cachear
            return await downloadAndCacheFile(url, fileType);
        }
    } catch (error) {
        console.error(`❌ Erro ao obter URL otimizada para ${fileType}:`, error);
        return url; // Fallback para URL original
    }
};

// Remover arquivo do cache
const removeFromCache = async (url) => {
    try {
        const metadata = await getCacheMetadata();
        if (metadata[url]) {
            const fileInfo = await FileSystem.getInfoAsync(metadata[url].filePath);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(metadata[url].filePath);
                console.log('🗑️ Arquivo removido do cache:', metadata[url].filePath);
            }
            delete metadata[url];
            await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
        }
    } catch (error) {
        console.error('❌ Erro ao remover do cache:', error);
    }
};

// Limpar cache antigo (baseado em expiração e último acesso)
const cleanupOldCache = async () => {
    try {
        const metadata = await getCacheMetadata();
        const now = Date.now();
        let removedCount = 0;
        let removedSize = 0;

        for (const [url, info] of Object.entries(metadata)) {
            const isExpired = isFileExpired(info);
            const isOldStory = info.isStory && (now - info.lastAccessed) > (2 * 24 * 60 * 60 * 1000); // 2 dias sem acesso

            if (isExpired || isOldStory) {
                try {
                    const fileInfo = await FileSystem.getInfoAsync(info.filePath);
                    if (fileInfo.exists) {
                        await FileSystem.deleteAsync(info.filePath);
                        removedSize += info.fileSize || 0;
                        console.log('🗑️ Arquivo expirado removido:', info.filePath);
                    }
                    delete metadata[url];
                    removedCount++;
                } catch (error) {
                    console.error('❌ Erro ao remover arquivo expirado:', error);
                }
            }
        }

        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
        console.log(`🧹 Cache limpo: ${removedCount} arquivos, ${(removedSize / (1024 * 1024)).toFixed(2)}MB liberados`);
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
    }
};

// Obter estatísticas do cache
const getCacheStats = async () => {
    try {
        const metadata = await getCacheMetadata();
        const totalFiles = Object.keys(metadata).length;
        const totalSize = Object.values(metadata).reduce((sum, info) => sum + (info.fileSize || 0), 0);

        const storyFiles = Object.values(metadata).filter(info => info.isStory).length;
        const generalFiles = totalFiles - storyFiles;

        return {
            totalFiles,
            storyFiles,
            generalFiles,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            maxSizeMB: MAX_CACHE_SIZE_MB
        };
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas do cache:', error);
        return {
            totalFiles: 0,
            storyFiles: 0,
            generalFiles: 0,
            totalSizeBytes: 0,
            totalSizeMB: '0.00',
            maxSizeMB: MAX_CACHE_SIZE_MB
        };
    }
};

// Verificar integridade do cache
const verifyCacheIntegrity = async () => {
    try {
        const metadata = await getCacheMetadata();
        console.log('🔍 Verificando integridade do cache...');

        for (const [url, info] of Object.entries(metadata)) {
            const fileInfo = await FileSystem.getInfoAsync(info.filePath);
            console.log(`📁 ${info.filePath}: ${fileInfo.exists ? 'EXISTE' : 'NÃO EXISTE'} (${fileInfo.size || 0} bytes)`);

            if (!fileInfo.exists) {
                console.log(`⚠️ Arquivo não existe mas está no metadata: ${info.filePath}`);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao verificar integridade do cache:', error);
    }
};

// Limpar todo o cache
const clearAllCache = async () => {
    try {
        await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
        await AsyncStorage.removeItem(CACHE_METADATA_KEY);
        console.log('🗑️ Todo o cache de mídia foi limpo');
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
    }
};

export {
    getOptimizedUrl,
    isFileCached,
    getCachedFilePath,
    cleanupOldCache,
    getCacheStats,
    clearAllCache,
    verifyCacheIntegrity,
    removeFromCache
}; 