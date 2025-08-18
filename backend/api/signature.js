// backend/signature.js
import express from 'express';
import cloudinary from 'cloudinary';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Configurar Cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Endpoint para gerar assinatura
app.post('/signature', (req, res) => {
    try {
        const { public_id, folder } = req.body;

        // Timestamp atual
        const timestamp = Math.floor(Date.now() / 1000);

        // Gerar assinatura
        const signature = cloudinary.v2.utils.api_sign_request(
            {
                timestamp,
                public_id,
                folder,
            },
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature,
            timestamp,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        });
    } catch (err) {
        console.error('Erro ao gerar assinatura:', err);
        res.status(500).json({ error: 'Erro ao gerar assinatura' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server rodando na porta ${PORT}`));
