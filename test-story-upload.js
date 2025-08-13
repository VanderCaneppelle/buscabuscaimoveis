// Script de teste para verificar upload de stories
import { supabase } from './lib/supabase';

const testStoryUpload = async () => {
    try {
        console.log('Iniciando teste de upload...');

        // Criar uma imagem de teste simples (1x1 pixel PNG)
        const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

        // Converter para blob
        const response = await fetch(testImageData);
        const blob = await response.blob();

        console.log('Blob criado:', {
            size: blob.size,
            type: blob.type
        });

        // Upload para storage
        const fileName = `test-${Date.now()}.png`;
        const { data, error } = await supabase.storage
            .from('stories')
            .upload(fileName, blob, {
                contentType: 'image/png',
                cacheControl: '3600'
            });

        if (error) {
            console.error('Erro no upload:', error);
            return;
        }

        console.log('Upload bem-sucedido:', data);

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(fileName);

        console.log('URL pública:', publicUrl);

        // Testar se a URL é acessível
        const imageResponse = await fetch(publicUrl);
        console.log('Status da imagem:', imageResponse.status);
        console.log('Headers da imagem:', imageResponse.headers);

    } catch (error) {
        console.error('Erro no teste:', error);
    }
};

export default testStoryUpload; 