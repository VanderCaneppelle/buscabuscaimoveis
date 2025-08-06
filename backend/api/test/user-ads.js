import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        console.log(`📋 Buscando anúncios do usuário: ${userId}`);

        // Buscar todos os anúncios do usuário
        const { data: allAds, error: allError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (allError) {
            console.error('❌ Erro ao buscar anúncios:', allError);
            return res.status(500).json({ error: 'Erro ao buscar anúncios' });
        }

        // Buscar anúncios por status
        const { data: approvedAds, error: approvedError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'approved');

        const { data: pendingAds, error: pendingError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending');

        const { data: activeAds, error: activeError } = await supabase
            .from('properties')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

        // Anúncios que contam para o limite (approved, pending, active)
        const relevantAds = allAds?.filter(ad => ['approved', 'pending', 'active'].includes(ad.status)) || [];

        console.log('✅ Anúncios encontrados:', {
            total: allAds?.length || 0,
            approved: approvedAds?.length || 0,
            pending: pendingAds?.length || 0,
            active: activeAds?.length || 0,
            relevant: relevantAds.length
        });

        return res.status(200).json({
            success: true,
            stats: {
                total: allAds?.length || 0,
                approved: approvedAds?.length || 0,
                pending: pendingAds?.length || 0,
                active: activeAds?.length || 0,
                relevant: relevantAds.length
            },
            allAds: allAds,
            relevantAds: relevantAds
        });

    } catch (error) {
        console.error('❌ Erro no endpoint user-ads:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 