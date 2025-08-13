const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://rxozhlxmfbioqgqomkrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4b3pobHhtZmJpb3FncW9ta3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTg0MDIsImV4cCI6MjA2OTU3NDQwMn0.MsMaFjnQYvDP7xSmHS-QY2P7jZ4JCnnxDmCo6y0lk4g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAuth() {
    console.log('🔐 Verificando autenticação...');

    try {
        // 1. Verificar se o cliente está configurado
        console.log('1️⃣ Verificando configuração do cliente...');
        console.log('URL:', supabaseUrl);
        console.log('Key (primeiros 20 chars):', supabaseKey.substring(0, 20) + '...');

        // 2. Testar uma operação simples
        console.log('\n2️⃣ Testando operação simples...');
        const { data, error } = await supabase
            .from('stories')
            .select('count')
            .limit(1);

        if (error) {
            console.error('❌ Erro na consulta:', error);
        } else {
            console.log('✅ Consulta realizada com sucesso:', data);
        }

        // 3. Verificar se há sessão ativa
        console.log('\n3️⃣ Verificando sessão...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Sessão:', session ? 'Ativa' : 'Inativa');

        if (session) {
            console.log('User ID:', session.user.id);
            console.log('Email:', session.user.email);
        }

        // 4. Testar storage com autenticação
        console.log('\n4️⃣ Testando storage...');
        const { data: storageData, error: storageError } = await supabase.storage
            .from('stories')
            .list('', { limit: 1 });

        if (storageError) {
            console.error('❌ Erro no storage:', storageError);
            console.log('Código de erro:', storageError.statusCode);
            console.log('Mensagem:', storageError.message);
        } else {
            console.log('✅ Storage acessível:', storageData);
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
    }
}

checkAuth(); 