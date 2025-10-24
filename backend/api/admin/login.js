import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
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

        if (profileError || !profile || !profile.is_admin) {
            console.error('❌ Usuário não é admin:', email);
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
        console.error('❌ Erro no endpoint de login:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
