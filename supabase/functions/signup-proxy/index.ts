// index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const supabasePublic = createClient(SUPABASE_URL, ANON_KEY);

const CONFIRM_EMAIL_REDIRECT =
    Deno.env.get('CONFIRM_EMAIL_REDIRECT_URL') ??
    'https://buscabuscaimoveis.com.br/confirmacao.html';

const ALLOWED_ORIGINS = [
    'https://buscabusca.vercel.app',
    'https://buscabuscaimoveis.com.br',
    'https://buscabuscaimoveis.com.br/confirmacao.html',
    'buscabuscaimoveis://confirm-email',
    'exp://127.0.0.1:8081'
];

function corsHeaders(origin: string | null) {
    const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
    return {
        'Access-Control-Allow-Origin': allow,
        'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
}

function json(body: any, status = 200, origin: string | null = null) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'content-type': 'application/json',
            ...corsHeaders(origin)
        }
    });
}

async function safeJson(r: Response) {
    try {
        return await r.json();
    } catch {
        return await r.text();
    }
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin');

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: corsHeaders(origin),
            status: 204
        });
    }

    if (req.method !== 'POST') {
        return json({
            success: false,
            message: 'Method not allowed'
        }, 200, origin);
    }

    try {
        // Receber TODOS os dados do frontend
        const {
            email: rawEmail,
            password,
            full_name,
            phone,
            is_realtor,
            creci,
            company_name
        } = await req.json();

        const email = (rawEmail || '').trim().toLowerCase();

        // Validações básicas
        if (!email || !password) {
            return json({
                success: false,
                message: 'Email e senha são obrigatórios'
            }, 200, origin);
        }

        if (!full_name || !phone) {
            return json({
                success: false,
                message: 'Nome completo e telefone são obrigatórios'
            }, 200, origin);
        }

        // Validar nome completo (deve ter pelo menos nome e sobrenome)
        const nameParts = full_name.trim().split(/\s+/); // Split por espaços
        if (nameParts.length < 2) {
            return json({
                success: false,
                message: 'Por favor, digite seu nome completo (nome e sobrenome)'
            }, 200, origin);
        }

        // Verificar se cada parte do nome tem pelo menos 2 caracteres
        const hasInvalidPart = nameParts.some(part => part.length < 2);
        if (hasInvalidPart) {
            return json({
                success: false,
                message: 'Nome e sobrenome devem ter pelo menos 2 caracteres cada'
            }, 200, origin);
        }

        // 1. Checar se usuário já existe (Admin REST)
        const url = `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
        const r = await fetch(url, {
            method: 'GET',
            headers: {
                apikey: SERVICE_ROLE_KEY,
                authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                'content-type': 'application/json'
            }
        });

        if (!r.ok) {
            return json({
                success: false,
                message: 'Falha ao checar usuário',
                details: await safeJson(r)
            }, 200, origin);
        }

        const list: any = await r.json();
        const existing = (list?.users || []).find((u: any) =>
            (u.email || '').toLowerCase() === email
        );

        if (existing) {
            const isConfirmed = !!existing.email_confirmed_at;

            if (isConfirmed) {
                return json({
                    success: false,
                    code: 'EMAIL_TAKEN',
                    message: 'E-mail já cadastrado'
                }, 200, origin);
            }

            // Reenviar email de confirmação
            await supabasePublic.auth.resend({
                type: 'signup',
                email
            });

            return json({
                success: false,
                code: 'EMAIL_PENDING',
                message: 'Cadastro pendente. Reenviamos o e-mail de confirmação.'
            }, 200, origin);
        }

        // 2. Criar usuário (auth) com metadados
        const { data, error } = await supabasePublic.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: CONFIRM_EMAIL_REDIRECT,
                data: {
                    full_name: full_name,
                    phone: phone,
                    is_realtor: !!is_realtor,
                }
            }
        });

        if (error) {
            return json({
                success: false,
                message: error.message,
                code: error.code
            }, 200, origin);
        }

        const userId = data.user?.id;

        if (!userId) {
            return json({
                success: false,
                message: 'Erro ao obter ID do usuário'
            }, 200, origin);
        }

        // 3. Criar perfil usando SERVICE_ROLE_KEY (ignora RLS)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                full_name: full_name,
                phone: phone,
                is_realtor: !!is_realtor,
                creci: is_realtor ? (creci || null) : null,
                company_name: is_realtor ? (company_name || null) : null,
            });

        if (profileError) {
            console.error('❌ Erro ao criar perfil:', profileError);

            // Tentar deletar o usuário criado (rollback manual)
            try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
                console.log('✅ Usuário deletado após falha no perfil');
            } catch (deleteError) {
                console.error('❌ Erro ao deletar usuário:', deleteError);
            }

            return json({
                success: false,
                message: 'Erro ao criar perfil. Tente novamente.',
                details: profileError.message
            }, 200, origin);
        }

        console.log('✅ Usuário e perfil criados com sucesso:', userId);

        return json({
            success: true,
            message: 'Email de confirmação enviado',
            userId: userId
        }, 200, origin);

    } catch (e) {
        console.error('❌ Erro interno:', e);
        return json({
            success: false,
            message: 'Erro interno',
            details: String(e)
        }, 200, origin);
    }
});

