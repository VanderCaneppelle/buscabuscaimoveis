// Teste para verificar se a URL do vídeo está acessível
const testVideoUrl = async () => {
    const videoUrl = "https://rxozhlxmfbioqgqomkrz.supabase.co/storage/v1/object/public/stories/stories/1755018403835.mp4";

    try {
        console.log('Testando URL do vídeo:', videoUrl);

        const response = await fetch(videoUrl, { method: 'HEAD' });
        console.log('Status da resposta:', response.status);
        console.log('Headers:', response.headers);

        if (response.ok) {
            console.log('✅ URL do vídeo está acessível');
        } else {
            console.log('❌ URL do vídeo não está acessível');
        }

    } catch (error) {
        console.error('❌ Erro ao testar URL:', error);
    }
};

export default testVideoUrl; 