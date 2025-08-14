import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_DIR = `${FileSystem.documentDirectory}media_cache/`;
const CACHE_METADATA_KEY = 'media_cache_metadata';

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

            // Salvar metadados do cache
            await updateCacheMetadata(url, filePath, fileSize);

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

// Atualizar metadados do cache
const updateCacheMetadata = async (url, filePath, fileSize) => {
    try {
        const metadata = await getCacheMetadata();
        metadata[url] = {
            filePath,
            fileSize: parseInt(fileSize) || 0,
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

// Obter URL otimizada (cache ou original)
const getOptimizedUrl = async (url, fileType = 'media') => {
    if (!url) return null;

    try {
        // Verificar se arquivo está em cache
        const isCached = await isFileCached(url);

        if (isCached) {
            const cachedPath = getCachedFilePath(url);
            console.log(`📦 Usando ${fileType} do cache:`, cachedPath);

            // Atualizar último acesso
            const metadata = await getCacheMetadata();
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

// Limpar cache antigo (manter apenas últimos 7 dias)
const cleanupOldCache = async () => {
    try {
        const metadata = await getCacheMetadata();
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        for (const [url, info] of Object.entries(metadata)) {
            if (info.cachedAt < sevenDaysAgo) {
                // Remover arquivo
                const fileInfo = await FileSystem.getInfoAsync(info.filePath);
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(info.filePath);
                    console.log('🗑️ Arquivo antigo removido:', info.filePath);
                }

                // Remover do metadata
                delete metadata[url];
            }
        }

        await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata));
        console.log('🧹 Cache antigo limpo');
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

        console.log('📊 Debug - Metadata completo:', JSON.stringify(metadata, null, 2));
        console.log('📊 Debug - Total files:', totalFiles);
        console.log('📊 Debug - Total size bytes:', totalSize);

        return {
            totalFiles,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas do cache:', error);
        return { totalFiles: 0, totalSizeBytes: 0, totalSizeMB: '0.00' };
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
    verifyCacheIntegrity
}; 