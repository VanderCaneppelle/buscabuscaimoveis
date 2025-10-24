import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    console.log('🔍 USER-EMAIL - Endpoint chamado!');
    console.log('🔍 USER-EMAIL - Method:', req.method);
    console.log('🔍 USER-EMAIL - Query:', req.query);
    
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                error: 'User ID is required' 
            });
        }

        console.log('🔍 USER-EMAIL - Buscando email do usuário:', userId);

        // Buscar email usando função RPC
        const { data: userEmail, error } = await supabase
            .rpc('get_user_email', { user_id: userId });

        if (error) {
            console.error('❌ USER-EMAIL - Erro ao buscar email:', error);
            return res.status(500).json({ 
                error: 'Failed to fetch user email',
                details: error.message 
            });
        }

        if (!userEmail) {
            console.error('❌ USER-EMAIL - Email não encontrado:', userId);
            return res.status(404).json({ 
                error: 'User email not found' 
            });
        }

        console.log('✅ USER-EMAIL - Email encontrado:', userEmail);

        return res.status(200).json({
            success: true,
            data: userEmail
        });

    } catch (error) {
        console.error('❌ USER-EMAIL - Erro interno:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

export default adminMiddleware(handler);
