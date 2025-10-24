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
    
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS request, retornando 200');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, display_name')
            .eq('id', data.user.id)
            .single();

        console.log('🔍 DEBUG - Profile encontrado:', profile);
        console.log('🔍 DEBUG - Profile error:', profileError);
        console.log('🔍 DEBUG - is_admin value:', profile?.is_admin);
        console.log('🔍 DEBUG - is_admin type:', typeof profile?.is_admin);

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
                name: profile.display_name,
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
