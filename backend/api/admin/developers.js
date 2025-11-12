import { adminMiddleware } from './middleware.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handleGet(req, res) {
    const {
        search = '',
        city = '',
        state = '',
        page = 1,
        limit = 20,
        includeInactive = 'false',
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
        .from('developers')
        .select(`
            id,
            name,
            name_composition,
            full_name,
            city_name,
            city_uf,
            phone,
            email,
            website,
            is_verified,
            is_active,
            created_at,
            updated_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

    if (search) {
        const term = search.trim();
        query = query.or([
            `name.ilike.%${term}%`,
            `name_composition.ilike.%${term}%`,
            `full_name.ilike.%${term}%`,
            `city_name.ilike.%${term}%`
        ].join(','));
    }

    if (city) {
        query = query.ilike('city_name', `%${city.trim()}%`);
    }

    if (state) {
        query = query.ilike('city_uf', `%${state.trim()}%`);
    }

    if (includeInactive !== 'true') {
        query = query.eq('is_active', true);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('❌ Erro ao listar construtoras:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar construtoras',
            details: error.message
        });
    }

    return res.status(200).json({
        success: true,
        data,
        pagination: {
            page: pageNumber,
            limit: pageSize,
            total: count || 0,
            pages: count ? Math.ceil(count / pageSize) : 0,
        },
    });
}

async function handlePost(req, res) {
    const {
        name,
        nameComposition = null,
        cityName,
        cityUf,
        phone,
        email = null,
        website = null,
        description = null,
        cnpj = null,
        isVerified = false,
    } = req.body || {};

    if (!name || !cityName || !phone) {
        return res.status(400).json({
            success: false,
            error: 'Campos obrigatórios ausentes',
            details: 'Informe nome, cidade e telefone.',
        });
    }

    const payload = {
        name: name.trim(),
        name_composition: nameComposition?.trim() || null,
        city_name: cityName.trim(),
        city_uf: cityUf ? cityUf.trim().toUpperCase() : null,
        phone: phone.trim(),
        email: email?.trim() || null,
        website: website?.trim() || null,
        description: description?.trim() || null,
        cnpj: cnpj?.trim() || null,
        is_verified: Boolean(isVerified),
        is_active: true,
        user_id: req.adminUser?.id || null,
    };

    const { data, error } = await supabase
        .from('developers')
        .insert(payload)
        .select()
        .single();

    if (error) {
        const isUniqueViolation = error.code === '23505';
        console.error('❌ Erro ao criar construtora:', error);

        return res.status(isUniqueViolation ? 409 : 500).json({
            success: false,
            error: isUniqueViolation
                ? 'Construtora já cadastrada'
                : 'Erro ao criar construtora',
            details: error.message,
        });
    }

    return res.status(201).json({
        success: true,
        message: 'Construtora cadastrada com sucesso',
        data,
    });
}

async function handler(req, res) {
    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'POST':
                return await handlePost(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST']);
                return res.status(405).json({
                    success: false,
                    error: 'Método não permitido',
                });
        }
    } catch (error) {
        console.error('❌ Erro inesperado no endpoint de construtoras:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message,
        });
    }
}

export default adminMiddleware(handler);

