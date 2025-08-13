const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVideoUpload() {
    console.log('🎥 Testando upload de vídeo...');

    try {
        // Criar um vídeo de teste pequeno (1 segundo, baixa qualidade)
        const testVideoData = new Uint8Array([
            0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32,
            0x00, 0x00, 0x00, 0x00, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        const testFileName = `test-video-${Date.now()}.mp4`;

        console.log('📦 Tamanho do vídeo de teste:', testVideoData.length, 'bytes');

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stories')
            .upload(testFileName, testVideoData, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erro no upload de vídeo:', uploadError);
            return;
        }

        console.log('✅ Upload de vídeo realizado:', uploadData);

        // Verificar se o arquivo foi salvo
        const { data: fileData, error: fileError } = await supabase.storage
            .from('stories')
            .list('', { search: testFileName });

        if (fileError) {
            console.error('❌ Erro ao listar arquivo:', fileError);
        } else {
            console.log('✅ Arquivo de vídeo encontrado:', fileData);
        }

        // Limpar arquivo de teste
        const { error: deleteError } = await supabase.storage
            .from('stories')
            .remove([testFileName]);

        if (deleteError) {
            console.error('❌ Erro ao deletar arquivo de teste:', deleteError);
        } else {
            console.log('✅ Arquivo de vídeo de teste removido');
        }

        console.log('🎉 Teste de vídeo concluído!');

    } catch (error) {
        console.error('❌ Erro no teste de vídeo:', error);
    }
}

testVideoUpload(); 