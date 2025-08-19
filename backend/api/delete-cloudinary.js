import { v2 as cloudinary } from 'cloudinary';

// Configurar credenciais do Cloudinary
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
};



cloudinary.config(cloudinaryConfig);

/**
 * Extrair public_id de URL do Cloudinary
 */
function extractPublicId(url) {
    try {
        // Padrão: https://res.cloudinary.com/cloud_name/resource_type/upload/v1234567890/folder/filename.ext
        const match = url.match(/\/v\d+\/([^\/]+)\./);
        if (match) {
            return match[1];
        }

        // Padrão alternativo: https://res.cloudinary.com/cloud_name/resource_type/upload/folder/filename.ext
        const altMatch = url.match(/\/upload\/([^\/]+)\./);
        if (altMatch) {
            return altMatch[1];
        }

        return null;
    } catch (error) {
        console.warn('Erro ao extrair public_id:', error);
        return null;
    }
}

/**
 * Detectar tipo de recurso da URL
 */
function detectResourceType(url) {
    if (url.includes('/video/')) {
        return 'video';
    } else if (url.includes('/image/')) {
        return 'image';
    } else {
        return 'raw';
    }
}

// Handler da API
export default async function handler(req, res) {
    console.log('🚀 API delete-cloudinary chamada:', {
        method: req.method,
        body: req.body,
        headers: req.headers
    });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { url } = req.body;

        if (!url) {
            console.log('❌ URL não fornecida');
            return res.status(400).json({ error: 'URL é obrigatória' });
        }

        const publicId = extractPublicId(url);
        if (!publicId) {
            return res.status(400).json({ error: 'Não foi possível extrair public_id da URL' });
        }

        const resourceType = detectResourceType(url);

        console.log('🗑️ Excluindo do Cloudinary:', { publicId, resourceType, url });

        // Usar SDK oficial do Cloudinary para exclusão
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(publicId, {
                resource_type: resourceType
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        console.log('✅ Arquivo excluído do Cloudinary:', result);

        return res.status(200).json({
            success: true,
            message: 'Arquivo excluído com sucesso',
            result
        });

    } catch (error) {
        console.error('❌ Erro na API de exclusão do Cloudinary:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
}
