const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthenticatedUpload() {
    console.log('🔐 Testando upload com autenticação...');

    try {
        // 1. Tentar fazer login com um usuário existente
        console.log('1️⃣ Tentando autenticação...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'vandercaneppelle@outlook.com',
            password: '123456'
        });

        if (authError) {
            console.error('❌ Erro na autenticação:', authError);
            console.log('⚠️ Continuando sem autenticação...');
        } else {
            console.log('✅ Usuário autenticado:', authData.user.email);
        }

        // 2. Verificar sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        console.log('2️⃣ Sessão atual:', session ? 'Ativa' : 'Inativa');

        // 3. Testar upload de vídeo
        console.log('3️⃣ Testando upload de vídeo...');

        // Criar um vídeo de teste pequeno
        const testVideoData = new Uint8Array([
            0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32,
            0x00, 0x00, 0x00, 0x00, 0x6D, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6F, 0x6D,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ]);

        const testFileName = `auth-test-${Date.now()}.mp4`;

        console.log('📦 Tamanho do vídeo:', testVideoData.length, 'bytes');

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('stories')
            .upload(testFileName, testVideoData, {
                contentType: 'video/mp4',
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            console.log('Código de erro:', uploadError.statusCode);
            console.log('Mensagem:', uploadError.message);
        } else {
            console.log('✅ Upload realizado com sucesso:', uploadData);
        }

        // 4. Limpar arquivo de teste
        if (!uploadError) {
            const { error: deleteError } = await supabase.storage
                .from('stories')
                .remove([testFileName]);

            if (deleteError) {
                console.error('❌ Erro ao deletar arquivo:', deleteError);
            } else {
                console.log('✅ Arquivo de teste removido');
            }
        }

        // 5. Fazer logout
        await supabase.auth.signOut();
        console.log('4️⃣ Logout realizado');

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

testAuthenticatedUpload(); 