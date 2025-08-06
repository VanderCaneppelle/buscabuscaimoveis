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
        console.log('📋 Buscando planos disponíveis...');

        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .order('price', { ascending: true });

        if (error) {
            console.error('❌ Erro ao buscar planos:', error);
            return res.status(500).json({ error: 'Erro ao buscar planos' });
        }

        console.log('✅ Planos encontrados:', plans.length);

        return res.status(200).json({
            success: true,
            plans: plans
        });

    } catch (error) {
        console.error('❌ Erro no endpoint plans:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
} 