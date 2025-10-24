import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
    try {
        // Buscar contagens por status
        const [totalResult, pendingResult, approvedResult, rejectedResult] = await Promise.all([
            supabase.from('properties').select('id', { count: 'exact', head: true }),
            supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('properties').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
        ]);

        return res.status(200).json({
            success: true,
            total: totalResult.count || 0,
            pending: pendingResult.count || 0,
            approved: approvedResult.count || 0,
            rejected: rejectedResult.count || 0
        });

    } catch (error) {
        console.error('❌ Erro no endpoint de estatísticas:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export default adminMiddleware(handler);
