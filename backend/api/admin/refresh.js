import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ 
                success: false,
                error: 'Refresh token is required' 
            });
        }

        console.log('🔄 Tentando refresh do token...');

        // Usar o refresh token para obter um novo access token
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token
        });

        if (error || !data.session) {
            console.error('❌ Erro ao fazer refresh:', error);
            return res.status(401).json({ 
                success: false,
                error: 'Invalid or expired refresh token',
                message: error?.message 
            });
        }

        // Verificar se o usuário ainda é admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_admin, full_name')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile || !profile.is_admin) {
            console.error('❌ Usuário não é mais admin após refresh');
            return res.status(403).json({ 
                success: false,
                error: 'User is not an admin' 
            });
        }

        console.log('✅ Token refresh bem-sucedido');

        return res.status(200).json({
            success: true,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error('❌ Erro no refresh:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message 
        });
    }
}

