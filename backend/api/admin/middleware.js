import { supabase } from '../../lib/supabase.js';

export async function verifyAdminToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'No token provided' };
    }

    const token = authHeader.substring(7);
    
    try {
        // Verificar se o token é válido e se o usuário é admin
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return { valid: false, error: 'Invalid token' };
        }

        // Verificar se o usuário tem role de admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return { valid: false, error: 'Not an admin' };
        }

        return { valid: true, user };
    } catch (error) {
        console.error('❌ Erro na verificação do token:', error);
        return { valid: false, error: 'Token verification failed' };
    }
}

export function adminMiddleware(handler) {
    return async (req, res) => {
        // Configurar CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        // Verificar autenticação
        const authResult = await verifyAdminToken(req.headers.authorization);
        
        if (!authResult.valid) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: authResult.error 
            });
        }

        // Adicionar usuário autenticado ao request
        req.adminUser = authResult.user;
        
        return handler(req, res);
    };
}
