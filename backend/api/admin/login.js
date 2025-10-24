import { createClient } from '@supabase/supabase-js';

// Usar SERVICE_ROLE_KEY para bypass do RLS
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 DEBUG - SUPABASE_URL:', SUPABASE_URL ? 'Configurado' : 'NÃO CONFIGURADO');
console.log('🔍 DEBUG - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Configurado' : 'NÃO CONFIGURADO');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    throw new Error('Supabase environment variables not configured');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    console.log('🚀 LOGIN ENDPOINT CHAMADO!');
    console.log('🔍 Method:', req.method);
    console.log('🔍 Body:', req.body);
    console.log('🔍 URL:', req.url);
    console.log('🔍 Headers:', req.headers);
    
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS request, retornando 200');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Teste simples para verificar se o endpoint está funcionando
    if (req.body && req.body.test) {
        console.log('✅ TESTE - Endpoint funcionando!');
        return res.status(200).json({ 
            success: true, 
            message: 'Endpoint funcionando!',
            timestamp: new Date().toISOString()
        });
    }

    // Teste com credenciais específicas para debug
    if (req.body && req.body.email === 'test@test.com') {
        console.log('✅ TESTE - Credenciais de teste recebidas!');
        return res.status(200).json({ 
            success: true, 
            message: 'Teste de credenciais funcionando!',
            timestamp: new Date().toISOString()
        });
    }

    try {
        console.log('🔍 INICIANDO PROCESSO DE LOGIN...');
        
        const { email, password } = req.body;
        console.log('🔍 Email recebido:', email);
        console.log('🔍 Password recebido:', password ? 'SIM' : 'NÃO');

        if (!email || !password) {
            console.log('❌ Email ou password não fornecidos');
            return res.status(400).json({ error: 'Email and password are required' });
        }

        console.log('🔐 Tentativa de login admin:', email);

        // Fazer login no Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Erro no login:', error.message);
            return res.status(401).json({ 
                error: 'Invalid credentials',
                message: error.message 
            });
        }

        // Verificar se o usuário é admin
        console.log('🔍 DEBUG - Buscando perfil para user ID:', data.user.id);
        
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, full_name, id')
            .eq('id', data.user.id)
            .single();

        console.log('🔍 DEBUG - Profile encontrado:', profile);
        console.log('🔍 DEBUG - Profile error:', profileError);
        console.log('🔍 DEBUG - is_admin value:', profile?.is_admin);
        console.log('🔍 DEBUG - is_admin type:', typeof profile?.is_admin);
        
        // Se não encontrou perfil, buscar todos os perfis para debug
        if (profileError) {
            console.log('🔍 DEBUG - Erro ao buscar perfil, listando todos os perfis...');
            const { data: allProfiles, error: allError } = await supabase
                .from('profiles')
                .select('id, is_admin, full_name')
                .limit(5);
            
            console.log('🔍 DEBUG - Todos os perfis:', allProfiles);
            console.log('🔍 DEBUG - Erro ao listar todos:', allError);
        }

        if (profileError) {
            console.error('❌ Erro ao buscar perfil:', profileError);
            return res.status(500).json({ 
                error: 'Database error',
                message: 'Failed to fetch user profile' 
            });
        }

        if (!profile) {
            console.error('❌ Perfil não encontrado para usuário:', data.user.id);
            return res.status(404).json({ 
                error: 'Profile not found',
                message: 'User profile not found' 
            });
        }

        if (!profile.is_admin) {
            console.error('❌ Usuário não é admin:', email, 'is_admin:', profile.is_admin);
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'User is not an admin' 
            });
        }

        console.log('✅ Login admin bem-sucedido:', email);

        return res.status(200).json({
            success: true,
            user: {
                id: data.user.id,
                email: data.user.email,
                name: profile.full_name,
                is_admin: profile.is_admin
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error('❌ ERRO GLOBAL NO LOGIN:', error);
        console.error('❌ Stack trace:', error.stack);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
