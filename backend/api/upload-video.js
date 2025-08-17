import cloudinary from 'cloudinary';

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Aqui armazenamos os chunks temporariamente em memória
// key = fileName, value = array de Buffers
const memoryChunks = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { fileName, chunkIndex, totalChunks, chunkData, mimeType } = req.body;

        console.log(`📦 Recebido chunk ${chunkIndex + 1}/${totalChunks} de ${fileName}`);

        // Converter base64 para Buffer
        const buffer = Buffer.from(chunkData, 'base64');

        // Inicializa array de chunks se necessário
        if (!memoryChunks[fileName]) memoryChunks[fileName] = [];
        memoryChunks[fileName][chunkIndex] = buffer;

        // Se for o último chunk, montar arquivo completo e enviar para Cloudinary
        if (memoryChunks[fileName].filter(Boolean).length === totalChunks) {
            console.log('📦 Todos os chunks recebidos, juntando e enviando para Cloudinary');

            const finalBuffer = Buffer.concat(memoryChunks[fileName]);

            // Upload para Cloudinary usando upload_large
            const result = await cloudinary.v2.uploader.upload_large_stream(
                { resource_type: 'video', chunk_size: 2 * 1024 * 1024, public_id: fileName },
                finalBuffer
            );

            // Limpar memória
            delete memoryChunks[fileName];

            console.log('✅ Vídeo enviado para Cloudinary');
            return res.json({ url: result.secure_url });
        }

        // Retornar sucesso para cada chunk
        res.json({ message: `Chunk ${chunkIndex + 1} recebido` });
    } catch (err) {
        console.error('❌ Erro no upload do chunk:', err);
        res.status(500).json({ error: `Erro ao enviar chunk ${req.body.chunkIndex + 1}` });
    }
}
