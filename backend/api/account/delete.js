import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Endpoint para deletar conta de usuário
 * DELETE /api/account/delete
 * 
 * Requisitos da Apple Store:
 * - Deve permitir exclusão permanente de conta
 * - Deve ser acessível dentro do app
 * - Pode ter confirmação para evitar exclusão acidental
 */
export default async function handler(req, res) {
    // Configurar CORS
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Responder a requisições OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Apenas método POST permitido
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // 1. Verificar autenticação via token Bearer
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token de autenticação não fornecido'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        // 2. Verificar token e obter usuário
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido ou expirado'
            });
        }

        const userId = user.id;

        console.log(`🗑️ Iniciando exclusão de conta para usuário: ${userId} (${user.email})`);

        // 3. Chamar função SQL para deletar todos os dados relacionados
        const { data: deleteResult, error: deleteError } = await supabase.rpc(
            'delete_user_account',
            { user_uuid: userId }
        );

        if (deleteError) {
            console.error('❌ Erro ao deletar dados do usuário:', deleteError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao deletar dados do usuário',
                details: deleteError.message
            });
        }

        if (!deleteResult || !deleteResult.success) {
            console.error('❌ Falha ao deletar dados:', deleteResult);
            return res.status(500).json({
                success: false,
                error: deleteResult?.error || 'Falha ao deletar dados do usuário'
            });
        }

        console.log('✅ Dados deletados com sucesso:', deleteResult.deleted);

        // 4. Deletar conta de autenticação do Supabase
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteAuthError) {
            console.error('❌ Erro ao deletar conta de autenticação:', deleteAuthError);
            // Mesmo se falhar aqui, os dados já foram deletados
            // Retornar sucesso parcial com aviso
            return res.status(200).json({
                success: true,
                warning: 'Dados deletados, mas houve problema ao deletar conta de autenticação',
                deleted: deleteResult.deleted
            });
        }

        console.log('✅ Conta de autenticação deletada com sucesso');

        // 5. Retornar sucesso
        return res.status(200).json({
            success: true,
            message: 'Conta deletada com sucesso',
            deleted: deleteResult.deleted
        });

    } catch (error) {
        console.error('❌ Erro interno ao deletar conta:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno ao processar exclusão de conta',
            details: error.message
        });
    }
}

