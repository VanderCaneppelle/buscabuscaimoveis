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
            description,
            cnpj,
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

async function handlePut(req, res) {
    const {
        id,
        name,
        nameComposition = null,
        cityName,
        cityUf,
        phone,
        email = null,
        website = null,
        description = null,
        cnpj = null,
        isVerified = null,
        isActive = null,
    } = req.body || {};

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'ID da construtora é obrigatório',
        });
    }

    if (name !== undefined || cityName !== undefined || phone !== undefined) {
        if (!name || !cityName || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios ausentes',
                details: 'Informe nome, cidade e telefone.',
            });
        }
    }

    const payload = {};

    if (name !== undefined) payload.name = name.trim();
    if (nameComposition !== undefined) payload.name_composition = nameComposition?.trim() || null;
    if (cityName !== undefined) payload.city_name = cityName.trim();
    if (cityUf !== undefined) payload.city_uf = cityUf ? cityUf.trim().toUpperCase() : null;
    if (phone !== undefined) payload.phone = phone.trim();
    if (email !== undefined) payload.email = email?.trim() || null;
    if (website !== undefined) payload.website = website?.trim() || null;
    if (description !== undefined) payload.description = description?.trim() || null;
    if (cnpj !== undefined) payload.cnpj = cnpj?.trim() || null;
    if (isVerified !== null) payload.is_verified = Boolean(isVerified);
    if (isActive !== null) payload.is_active = Boolean(isActive);

    if (Object.keys(payload).length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Nenhum campo para atualizar',
        });
    }

    const { data, error } = await supabase
        .from('developers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        const isUniqueViolation = error.code === '23505';
        console.error('❌ Erro ao atualizar construtora:', error);
        return res.status(isUniqueViolation ? 409 : 500).json({
            success: false,
            error: isUniqueViolation
                ? 'Já existe uma construtora com esses dados'
                : 'Erro ao atualizar construtora',
            details: error.message,
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Construtora atualizada com sucesso',
        data,
    });
}

async function handleDelete(req, res) {
    const { id, hardDelete = false } = req.body || req.query || {};

    if (!id) {
        return res.status(400).json({
            success: false,
            error: 'ID da construtora é obrigatório',
        });
    }

    if (hardDelete === 'true' || hardDelete === true) {
        const { error } = await supabase
            .from('developers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Erro ao excluir construtora:', error);
            return res.status(500).json({
                success: false,
                error: 'Erro ao excluir construtora',
                details: error.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Construtora excluída permanentemente',
        });
    }

    const { data, error } = await supabase
        .from('developers')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao inativar construtora:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao inativar construtora',
            details: error.message,
        });
    }

    return res.status(200).json({
        success: true,
        message: 'Construtora inativada com sucesso',
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
            case 'PUT':
                return await handlePut(req, res);
            case 'DELETE':
                return await handleDelete(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
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

