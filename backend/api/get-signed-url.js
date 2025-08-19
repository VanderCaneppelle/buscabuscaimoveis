// api/get-signed-url.js
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { fileName, resourceType = 'video' } = req.body;

        if (!fileName) {
            return res.status(400).json({ message: 'fileName is required' });
        }

        // Gerar assinatura para upload seguro
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = {
            timestamp,
            upload_preset: 'stories', // preset configurado no Cloudinary
            public_id: fileName,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload_large`;

        const responsePayload = {
            url: uploadUrl,
            params: {
                ...paramsToSign,
                api_key: process.env.CLOUDINARY_API_KEY,
                signature,
            },
            public_id: fileName,
        };

        console.log('✅ Signed URL gerada:', responsePayload);

        res.status(200).json(responsePayload);
    } catch (err) {
        console.error('❌ Erro ao gerar signed URL:', err);
        res.status(500).json({ message: err.message });
    }
}
