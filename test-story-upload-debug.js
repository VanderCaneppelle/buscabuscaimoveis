const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStoryUpload() {
    console.log('🧪 Iniciando teste de upload de story...');

    try {
        // 1. Testar conectividade com o bucket
        console.log('\n1️⃣ Testando conectividade com bucket stories...');
        const { data: bucketData, error: bucketError } = await supabase.storage
            .from('stories')
            .list('', { limit: 1 });

        if (bucketError) {
            console.error('❌ Erro ao acessar bucket:', bucketError);
            return;
        }
        console.log('✅ Bucket acessível:', bucketData);

        // 2. Testar upload de um arquivo pequeno de teste
        console.log('\n2️⃣ Testando upload de arquivo de teste...');

        // Criar um arquivo de teste simples (imagem base64)
        const testContent = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        const testFileName = `test-${Date.now()}.jpg`;

        // Converter base64 para blob
        const base64Data = testContent.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stories')
            .upload(testFileName, bytes, {
                contentType: 'image/jpeg',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erro no upload de teste:', uploadError);
            return;
        }

        console.log('✅ Upload de teste realizado:', uploadData);

        // 3. Verificar se o arquivo foi salvo corretamente
        console.log('\n3️⃣ Verificando arquivo salvo...');
        const { data: fileData, error: fileError } = await supabase.storage
            .from('stories')
            .list('', { search: testFileName });

        if (fileError) {
            console.error('❌ Erro ao listar arquivo:', fileError);
        } else {
            console.log('✅ Arquivo encontrado:', fileData);
        }

        // 4. Obter URL pública
        console.log('\n4️⃣ Obtendo URL pública...');
        const { data: { publicUrl } } = supabase.storage
            .from('stories')
            .getPublicUrl(testFileName);

        console.log('✅ URL pública:', publicUrl);

        // 5. Testar download do arquivo
        console.log('\n5️⃣ Testando download do arquivo...');
        const response = await fetch(publicUrl);
        if (response.ok) {
            const downloadedContent = await response.text();
            console.log('✅ Download realizado:', {
                status: response.status,
                contentLength: downloadedContent.length,
                content: downloadedContent.substring(0, 50) + '...'
            });
        } else {
            console.error('❌ Erro no download:', response.status, response.statusText);
        }

        // 6. Limpar arquivo de teste
        console.log('\n6️⃣ Limpando arquivo de teste...');
        const { error: deleteError } = await supabase.storage
            .from('stories')
            .remove([testFileName]);

        if (deleteError) {
            console.error('❌ Erro ao deletar arquivo de teste:', deleteError);
        } else {
            console.log('✅ Arquivo de teste removido');
        }

        console.log('\n🎉 Teste concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

// Executar o teste
testStoryUpload(); 