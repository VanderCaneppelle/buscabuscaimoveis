const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuração do Supabase
const supabaseUrl = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealVideoUpload() {
    console.log('🎥 Testando upload de vídeo real...');

    try {
        // URL de um vídeo público de teste
        const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';

        console.log('📥 Baixando vídeo de teste...');
        const response = await fetch(videoUrl);

        if (!response.ok) {
            throw new Error(`Erro ao baixar vídeo: ${response.status}`);
        }

        const videoBuffer = await response.arrayBuffer();
        const videoData = new Uint8Array(videoBuffer);

        console.log('📦 Tamanho do vídeo real:', videoData.length, 'bytes');

        const testFileName = `real-video-${Date.now()}.mp4`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stories')
            .upload(testFileName, videoData, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erro no upload de vídeo real:', uploadError);
            return;
        }

        console.log('✅ Upload de vídeo real realizado:', uploadData);

        // Verificar se o arquivo foi salvo
        const { data: fileData, error: fileError } = await supabase.storage
            .from('stories')
            .list('', { search: testFileName });

        if (fileError) {
            console.error('❌ Erro ao listar arquivo:', fileError);
        } else {
            console.log('✅ Arquivo de vídeo real encontrado:', fileData);
        }

        // Limpar arquivo de teste
        const { error: deleteError } = await supabase.storage
            .from('stories')
            .remove([testFileName]);

        if (deleteError) {
            console.error('❌ Erro ao deletar arquivo de teste:', deleteError);
        } else {
            console.log('✅ Arquivo de vídeo real removido');
        }

        console.log('🎉 Teste de vídeo real concluído!');

    } catch (error) {
        console.error('❌ Erro no teste de vídeo real:', error);
    }
}

testRealVideoUpload(); 