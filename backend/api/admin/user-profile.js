import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    console.log('🔍 USER-PROFILE - Endpoint chamado!');
    console.log('🔍 USER-PROFILE - Method:', req.method);
    console.log('🔍 USER-PROFILE - Query:', req.query);
    
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }

        console.log('🔍 USER-PROFILE - Buscando perfil do usuário:', userId);

        // Buscar perfil do usuário
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, phone, creci')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('❌ USER-PROFILE - Erro ao buscar perfil:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch user profile',
                details: error.message 
            });
        }

        if (!profile) {
            console.error('❌ USER-PROFILE - Perfil não encontrado:', userId);
            return res.status(404).json({ 
                error: 'User profile not found' 
            });
        }

        console.log('✅ USER-PROFILE - Perfil encontrado:', profile.full_name);

        return res.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {
        console.error('❌ USER-PROFILE - Erro interno:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

export default adminMiddleware(handler);
