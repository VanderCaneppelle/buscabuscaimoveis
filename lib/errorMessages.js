/**
 * Utilitário para traduzir mensagens de erro do Supabase e outras APIs
 * para mensagens mais amigáveis em português
 */

/**
 * Traduz uma mensagem de erro para português
 * @param {string|Error} error - Mensagem de erro ou objeto Error
 * @returns {string} Mensagem traduzida em português
 */
export function translateError(error) {
    // Se for um objeto Error, pegar a mensagem
    let message = error?.message || error || 'Ocorreu um erro inesperado';

    // Converter para string e normalizar
    message = String(message).trim();

    // Mapeamento de erros comuns do Supabase
    const errorMap = {
        // Erros de autenticação
        'Invalid login credentials': 'E-mail ou senha incorretos. Tente novamente.',
        'Email not confirmed': 'Por favor, confirme seu e-mail antes de fazer login. Verifique sua caixa de entrada.',
        'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
        'User already registered': 'Este e-mail já está cadastrado. Tente fazer login ou recuperar sua senha.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
        'Signups are disabled': 'Cadastros estão temporariamente desabilitados. Entre em contato com o suporte.',
        'Invalid email': 'E-mail inválido. Verifique e tente novamente.',
        'User not found': 'Usuário não encontrado. Verifique seu e-mail.',
        'Token has expired': 'O link expirou. Solicite um novo link de recuperação de senha.',
        'Invalid token': 'Link inválido. Solicite um novo link de recuperação de senha.',
        
        // Erros de rede/conexão
        'Network request failed': 'Erro de conexão. Verifique sua internet e tente novamente.',
        'Failed to fetch': 'Erro de conexão. Verifique sua internet e tente novamente.',
        'NetworkError': 'Erro de conexão. Verifique sua internet e tente novamente.',
        'timeout': 'Tempo de conexão esgotado. Tente novamente.',
        'Timeout': 'Tempo de conexão esgotado. Tente novamente.',
        
        // Erros de permissão
        'new row violates row-level security policy': 'Você não tem permissão para realizar esta ação.',
        'permission denied': 'Você não tem permissão para realizar esta ação.',
        'JWT expired': 'Sua sessão expirou. Faça login novamente.',
        'JWTInvalid': 'Sessão inválida. Faça login novamente.',
        
        // Erros de banco de dados
        'duplicate key value violates unique constraint': 'Este registro já existe.',
        'violates foreign key constraint': 'Não é possível realizar esta ação. Dados relacionados não encontrados.',
        'null value in column': 'Preencha todos os campos obrigatórios.',
        
        // Erros genéricos
        'Internal Server Error': 'Erro interno do servidor. Tente novamente mais tarde.',
        'Service Unavailable': 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
        'Bad Request': 'Dados inválidos. Verifique as informações e tente novamente.',
        'Unauthorized': 'Você não está autorizado. Faça login novamente.',
        'Forbidden': 'Acesso negado. Você não tem permissão para esta ação.',
        'Not Found': 'Recurso não encontrado.',
        
        // Erros específicos do app
        'Usuário não encontrado': 'Usuário não encontrado.',
        'Token de autenticação não fornecido': 'Sessão expirada. Faça login novamente.',
        'Token inválido ou expirado': 'Sessão expirada. Faça login novamente.',
    };

    // Verificar se a mensagem exata está no mapa
    if (errorMap[message]) {
        return errorMap[message];
    }

    // Verificar se alguma chave do mapa está contida na mensagem (case insensitive)
    const lowerMessage = message.toLowerCase();
    for (const [key, value] of Object.entries(errorMap)) {
        if (lowerMessage.includes(key.toLowerCase())) {
            return value;
        }
    }

    // Se não encontrou tradução, retornar a mensagem original
    return message;
}

/**
 * Formata um erro para exibição em Alert
 * @param {string|Error} error - Mensagem de erro ou objeto Error
 * @param {string} defaultMessage - Mensagem padrão caso não encontre tradução
 * @returns {string} Mensagem formatada
 */
export function formatError(error, defaultMessage = 'Ocorreu um erro inesperado') {
    if (!error) {
        return defaultMessage;
    }

    const translated = translateError(error);
    
    // Se a tradução retornou a mensagem original e ela está vazia ou muito genérica,
    // usar a mensagem padrão
    if (translated === error && (!error || error === 'Error' || error === 'error')) {
        return defaultMessage;
    }

    return translated;
}

